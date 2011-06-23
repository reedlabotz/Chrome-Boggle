var cubes = new Array(
  new Array("T", "O", "E", "S", "S", "I"),
  new Array("A", "S", "P", "F", "F", "K"),
  new Array("N", "U", "I", "H", "M", "Qu"),
  new Array("O", "B", "J", "O", "A", "B"),
  new Array("L", "N", "H", "N", "R", "Z"),
  new Array("A", "H", "S", "P", "C", "O"),
  new Array("R", "Y", "V", "D", "E", "L"),
  new Array("I", "O", "T", "M", "U", "C"),
  new Array("L", "R", "E", "I", "X", "D"),
  new Array("T", "E", "R", "W", "H", "V"),
  new Array("T", "S", "T", "I", "Y", "D"),
  new Array("W", "N", "G", "E", "E", "H"),
  new Array("E", "R", "T", "T", "Y", "L"),
  new Array("O", "W", "T", "O", "A", "T"),
  new Array("A", "E", "A", "N", "E", "G"),
  new Array("E", "I", "U", "N", "E", "S")
);

var board;
var results;
var correct = 0;
var guesses = 0;
var score = 0;

//vars needed by the timer
var timeout;
var interval;
var startTime;

function Board(w, h, rules) {
  this.width = w;
  this.height = h;
  
  //Implement rules later  
}

function boggle_init() {
  board = new Board(4,4,"defaults");
  var i,j;
  
  var board_div = $("#board")
  
  var table = document.createElement("table");
  for(i=0; i<board.height; i++) {
    var row = document.createElement("tr");
    table.appendChild(row);
    for (j=0; j<board.width; j++) {
      var cell = document.createElement("td");
      cell.id = i + "-" + j;
      row.appendChild(cell);
    }
  }
  
  board_div.append(table);
  
  var button = document.createElement("input");
  button.type="button";
  button.value="Shake!";
  button.onclick=shake;
  board_div.append(button);

  shake();
}

function shake() {
  reset();
  var temp_cubes = new Array();
  var i, j;
  var board_id = "";
  
  for(i=0; i< board.width*board.height; i++)
    temp_cubes.push(i);
  
  for(i=0; i<board.height; i++) {
    for (j=0; j<board.width; j++) {
      var index = i + "-" + j;
      var random = Math.floor(Math.random() * temp_cubes.length);
      var cube = temp_cubes.splice(random,1)
      var letter =  cubes[cube][Math.floor(Math.random()*6)];
      if (letter == "Qu") {
        board_id += "q"
        document.getElementById(index).innerHTML = "<span class=\"qu\">Qu</span>";
      }
      else {
        board_id += letter.toLowerCase();
        document.getElementById(index).innerHTML = letter;
      }
    }
  }
  $.get("http://localhost:3000/?letters="+board_id,function(data){
       results = $.parseJSON(data);
       updateStats();
       $("#wordEntry").removeAttr("disabled");
       $("#wordEntry").focus();
       startTime = new Date().getTime();
       updateTimer();
       timeout = setTimeout("endGame()",180000);
       interval = setInterval("updateTimer()",1000);
    });
    
    
}

function checkWord(){
   var word = $("#wordEntry").val().toLowerCase();
   $("#wordEntry").val("");
   if(word != ""){
      guesses += 1;
      var hash = Sha1.hash(word + results.Id);
      var i = $.inArray(hash,results.Words)
      if(i >= 0){
         results.Words.splice(i,1);
         newWord = $(document.createElement("div"));
         newWord.html(word);
         $("#wordList").prepend(newWord);
         newWord.effect("highlight", {}, 3000);
         correct += 1;
         score += getScore(word);
      }
   }
   updateStats();
   return false;
}

function updateStats(){
   $("#stats").html("<p>Guesses: "+guesses+"</p><p>Correct: "+correct+"/"+results.Count+"</p><p>Score: "+score+"</p>");
}

function reset(){
   $("#wordList").html("");
   $("#stats").html("");
   $("#timer").html("");
   $("#wordEntry").val("");
   correct = 0;
   guesses = 0;
   score = 0;
   clearTimeout(timeout);
   clearInterval(interval);
}

function updateTimer(){
   var timeDiff = (new Date().getTime()) - startTime;
   var seconds = 180 - Math.round(timeDiff/1000);
   
   var min = Math.floor(seconds/60);
   var sec = seconds % 60;
   var secSpace = "";
   if(sec<10){
      secSpace = "0";
   }
   $("#timer").html("<p>Time: "+min+":"+secSpace+sec+"</p>");
}

function getScore(word){
   var length = word.length;
   if(length >= 8)
      return 11;
   if(length >= 7)
      return 4;
   if(length >= 6)
      return 3;
   if(length >= 5)
      return 2;
   if(length >= 4)
      return 1;
   if(length >= 3)
      return 1;
   return 0;
}

function endGame(){
   alert("Your time is up!");
   clearTimeout(timeout);
   clearInterval(interval);
   $('#wordEntry').attr("disabled", true); 
}