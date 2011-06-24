package main

import "fmt"
import "os"
import "bufio"
import "http"
import "flag"
import "template"
import "container/vector"
import "sort"
import "crypto/sha1"
import "json"
import "time"
import "log"

var logger *log.Logger
var loggerTab = "                    "

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


var addr = flag.String("addr", ":3000", "http service address")
var fmap = template.FormatterMap{
    "words": template.StringFormatter,
}
var templ = template.MustParse(templateStr, fmap)

var dict *Trie
var solutionBasket map[string]Solution


func main(){
   logger = log.New(os.Stdout,"",log.LstdFlags)
   dict = new(Trie)
   
   logger.Printf("Starting server\n")
   
   file, err := os.Open("dictionary.txt")
   if err != nil{
      logger.Printf("There was an error opening the dictionary\n")
      return
   }
   reader := bufio.NewReader(file)
   logger.Printf("Loading dictionary")
   i := 0
   for {
      line, _, err := reader.ReadLine()
      if err == os.EOF {
         break
      }
      
      addWord(dict,line)
      i++
   }
   logger.Printf("Loaded %d words\n",i)
   file.Close()
   
   solutionBasket = make(map[string]Solution)
   
   
   http.Handle("/",http.HandlerFunc(hashRequest))
   http.Handle("/solution",http.HandlerFunc(solutionRequest))
   err = http.ListenAndServe(*addr, nil)
   
}

func solutionRequest(w http.ResponseWriter, req *http.Request){
   id := req.FormValue("id")
   
   logger.Printf("SOLUTION REQUEST\n%sID: %s\n",loggerTab,id)
   
   solution,exists := solutionBasket[id]
   if !exists {
      return
   } 
   
   response,_ := json.Marshal(solution.words)
   
   solution.timer.Stop()
   
   var a Solution
   solutionBasket[id] = a,false
   
   templ.Execute(w, response)
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
   

   id := fmt.Sprintf("%s",solution.Id)
   
   //set the timer                 210 000 000 000  - 3.5 minutes
   solution.timer = time.AfterFunc(210000000000,func (){solutionExpired(id)})
   
   //remove all un needed content
   solution.Hashs = nil
   solution.SolutionSize = nil
   
   
   //add to the solution basket
   solutionBasket[id] = *solution
   
   
   logger.Printf("HASH REQUEST\n%sID: %s\n",loggerTab,solution.Id)

   templ.Execute(w, response)
}

func solutionExpired(id string){
   logger.Printf("SOLUTION EXPIRED\n%sID: %s",loggerTab,id)
   var a Solution
   solutionBasket[id] = a,false
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