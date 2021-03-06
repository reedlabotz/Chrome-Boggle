package shambles

import "fmt"
import "os"
import "bufio"
import "http"
import "template"
import "container/vector"
import "sort"
import "crypto/sha1"
import "json"
import "time"
import "appengine"
import "appengine/datastore"

const boardSize = 4

type Trie struct {
   children [26]*Trie
   isWord bool
}

type Solution struct {
   Id *UUID
   words vector.StringVector
   Hashs vector.StringVector
   Count int
   SolutionSize map[string]int
   MaxScore int
   timer *time.Timer
}

type StoredSolution struct{
   Words []byte
   Timestamp datastore.Time
}


var fmap = template.FormatterMap{
    "words": template.StringFormatter,
}
var templ = template.MustParse(templateStr, fmap)

var dict *Trie

func init(){
   dict = new(Trie)
   
   file, err := os.Open("dictionary.txt")
   if err != nil{
      fmt.Errorf("There was an error opening the dictionary\n")
      return
   }
   reader := bufio.NewReader(file)
   i := 0
   for {
      line, _, err := reader.ReadLine()
      if err == os.EOF {
         break
      }
      
      addWord(dict,line)
      i++
   }
   file.Close()
   
   
   http.HandleFunc("/",hashRequest)
   http.HandleFunc("/solution",solutionRequest)
}

func solutionRequest(w http.ResponseWriter, req *http.Request){
   idString := req.FormValue("id")
   id := datastore.NewKey("solution",idString,0,nil)
   
   storedSolution := new(StoredSolution)
   c := appengine.NewContext(req)
   err := datastore.Get(c,id,storedSolution)
   err2 := datastore.Delete(c,id)
   
   if err != nil {
      c.Errorf("SOLUTION REQUEST ERROR: %s\n",err)
      return
   }
   if err2 != nil {
      c.Errorf("SOLUTION DELETE ERROR: %s\n",err2)
   }
   
   c.Infof("SOLUTION REQUEST\n")
   
   templ.Execute(w, storedSolution.Words)
}

func hashRequest(w http.ResponseWriter, req *http.Request){
   lettersIn := req.FormValue("letters")
   if len(lettersIn) != 16{
      return
   }
   
   
   
   var letters []uint8 = make([]uint8,len(lettersIn))
   for i := 0; i<len(lettersIn); i++ {
      letters[i] = letterToInt(lettersIn[i])
   }
   
   
   
   solution := new(Solution)
   solution.Count = 0
   solution.Id = NewV4()
   solution.SolutionSize = map[string]int{"3":0, "4":0, "5":0, "6":0, "7":0, "8":0, "9":0, "10":0, "11":0, "12":0, "13":0, "14":0, "15":0, "16":0}
   solution.MaxScore = 0
   
   
   for i := 0; i<boardSize; i++ {
      for j := 0; j<boardSize; j++{
         soFar := make([]uint8,2*(boardSize*boardSize))
         checkString(i,j,letters,soFar[0:0],dict,solution)
      }
   }
   
   sort.Sort(&(solution.words))
   removeDuplicates(solution)
   hashWords(solution)
   
   response,_ := json.Marshal(solution)
   
   
   id := datastore.NewKey("solution",fmt.Sprintf("%s",solution.Id),0,nil)
   //store the solution to database
   storedSolution := new(StoredSolution)
   words,_ := json.Marshal(solution.words)
   storedSolution.Words = []byte(words)
   storedSolution.Timestamp = datastore.SecondsToTime(time.Seconds())
   
   c := appengine.NewContext(req)
   _, err := datastore.Put(c,id,storedSolution)
   if err != nil {
      c.Errorf("HASH REQUEST ERROR: %s\n",err)
      http.Error(w, err.String(), http.StatusInternalServerError)
      return
   }
   
   c.Infof("HASH REQUEST\n")
   templ.Execute(w, response)
}

func checkString(x int, y int, letters []uint8, soFar []uint8,dict *Trie,solution *Solution){
   letter := letterAt(x,y,letters)
   if letter == 255{
      return
   }
   
   soFar = soFar[0:len(soFar)+1]
   soFar[len(soFar)-1] = letter
   
   letters[(boardSize*x)+y] = 255
   
   good,dict := isWord(dict,soFar[len(soFar)-1:len(soFar)])
   
   if letter == 16 && dict != nil{
      u := make([]uint8,1)
      u[0] = 20
      soFar = soFar[0:len(soFar)+1]
      soFar[len(soFar)-1] = 20
      good,dict = isWord(dict,u)
   }
   
   if good && len(soFar) > 2{
      word := arrayToWord(soFar)
      solution.words.Push(word)
      solution.Count++
      length := fmt.Sprintf("%d", len(word))
      solution.SolutionSize[length]++
      solution.MaxScore += getScore(word)
   }
   
   if dict != nil{
      //check S
      checkString(x+1,y,letters,soFar,dict,solution)
      
      //check E
      checkString(x,y+1,letters,soFar,dict,solution)
      
      //check N
      checkString(x-1,y,letters,soFar,dict,solution)
      
      //check W
      checkString(x,y-1,letters,soFar,dict,solution)
      
      //check NE
      checkString(x-1,y-1,letters,soFar,dict,solution)
      
      //check SW
      checkString(x+1,y+1,letters,soFar,dict,solution)
      
      //check SE
      checkString(x+1,y-1,letters,soFar,dict,solution)
      
      //check NW
      checkString(x-1,y+1,letters,soFar,dict,solution)
   }
   letters[(boardSize*x)+y] = letter
}

func letterAt(x int,y int ,letters []uint8) uint8{
   if x<0 || x > boardSize-1 || y < 0 || y > boardSize-1{
      return 255
   }
   pos := (boardSize*x)+y
   return letters[pos]
}

func isWord(dict *Trie, word []uint8) (bool,*Trie){
   if len(word) == 0{
      return dict.isWord, dict
   }
   letter := word[0]
   if dict.children[letter] == nil {
      return false, nil
   }
   return isWord(dict.children[letter],word[1:])
}

func addWord(dict *Trie, word []uint8){
   if len(word) == 0 {
      dict.isWord = true
      return
   }
   letter := letterToInt(word[0])
   if dict.children[letter] == nil {
      dict.children[letter] = new(Trie)
   }
   addWord(dict.children[letter],word[1:])
}

func letterToInt(letter uint8) uint8{
   return letter-97
}

func intToLetter(letter uint8) uint8{
   return letter+97
}

func arrayToWord(letters []uint8) string{
   out := ""
   for i := 0; i<len(letters); i++{
      out += string(intToLetter(letters[i]))
   }
   return out
}

func removeDuplicates(solution *Solution){
   last := ""
   for i := 0;i<len(solution.words); i++{
      word := solution.words.At(i)
      if word == last{
         solution.Count--
         solution.words.Delete(i)
         i--
         length := fmt.Sprintf("%d", len(word))
         solution.SolutionSize[length]--
         solution.MaxScore -= getScore(word)
      }
      last = word
   }  
}

func hashWords(solution *Solution){
   id := solution.Id.String()
   for i := 0;i<len(solution.words); i++{
      word := solution.words.At(i)
      sha1 := sha1.New()
      sha1.Write([]byte(word+id))
      sha1String := fmt.Sprintf("%x", sha1.Sum())
      
      solution.Hashs.Push(sha1String)
   }

}

func getScore(word string) int{
   length := len(word)
   if length >= 8{
      return 11
   }
   if length >= 7{
      return 4
   }
   if length >= 6{
      return 3
   }
   if length >= 5{
      return 2
   }
   if length >= 4{
      return 1
   }
   if length >= 3{
      return 1
   }
   return 0
}

const templateStr = `{@|words}`