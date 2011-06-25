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
var correctWords = [];

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
  resizeScreen();
  shake();
}

function shake() {
   reset();
   for(i=0; i<board.height; i++) {
      for (j=0; j<board.width; j++) {
         $("#"+ i + "-" + j).html("<img src='loader.gif' />");
      }
   }
   var temp_cubes = new Array();
   var i, j;
   var board_id = "";
  
   for(i=0; i< board.width*board.height; i++)
      temp_cubes.push(i);
  
   for(i=0; i<board.height; i++) {
      for (j=0; j<board.width; j++) {
         var index = i + "-" + j;
         var random = Math.floor(Math.random() * temp_cubes.length);
         var cube = temp_cubes.splice(random,1);
         var letter =  cubes[cube][Math.floor(Math.random()*6)];
         if (letter == "Qu")
            board_id += "q";
         else
            board_id += letter.toLowerCase();
      }
   }
   $.get("http://localhost:8080/?letters="+board_id,function(data){
      results = $.parseJSON(data);
      for(i=0; i<board.height; i++) {
         for (j=0; j<board.width; j++) {
            var letter = board_id.charAt(i+4*j).toUpperCase()
            if(letter == "Q")
               $("#"+i+"-"+j).html("<span class=\"qu\">Qu</span>");
            else
               $("#"+i+"-"+j).html(letter);
         }
      }
      $("#wordEntry").removeAttr("disabled");
      $("#wordEntry").focus();
      startTime = new Date().getTime();
      timeout = setTimeout("endGame()",180500);
      interval = setInterval("updateTimer()",1000);
      $("#totalCount").html(results.Count)
   });
}

function checkWord(){
   var word = $("#wordEntry").val().toLowerCase();
   $("#wordEntry").val("");
   if(word != ""){
      guesses += 1;
      var hash = Sha1.hash(word + results.Id);
      var i = $.inArray(hash,results.Hashs)
      if(i >= 0){
         $("#wordEntry").effect("highlight", {"color":"#5EFB6E"}, 500);
         results.Hashs.splice(i,1);
         placeWord(word)
         
         correct += 1;
         score += getScore(word);
      }else{
         $("#wordEntry").effect("highlight", {"color":"#E77471"}, 500);
      }
      $("#word-"+word).effect("highlight", {"color":"#FFF8C6"}, 5000);
   }
   updateStats();
   return false;
}

function placeWord(word,missed){
   correctWords.push(word);
   correctWords.sort();
   newWord = $(document.createElement("div"));
   newWord.attr('id',"word-"+word)
   if(missed)
      newWord.addClass("missed-word");
   else
      checkScrollbar();
   newWord.html(word);
   lastId = ($.inArray(word,correctWords)) - 1
   if(lastId < 0){
      $("#wordList").prepend(newWord);
   }
   $("#word-"+correctWords[lastId]).after(newWord);
}

function updateStats(){
   $("#correctCount").html(correct);
   $("#score").html(score);
}

function reset(){
   $("#shake").hide();
   $("#endGame").show();
   $("#wordList").html("");
   $("#timer").html("3:00");
   $("#correctCount").html("0");
   $("#score").html("0");
   $("#totalCount").html("0")
   $("#wordEntry").val("");
   for(i=0; i<board.height; i++) {
      for (j=0; j<board.width; j++) {
         $("#"+ i + "-" + j).html("");
      }
   }
   correct = 0;
   guesses = 0;
   score = 0;
   correctWords = [];
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
   $("#timer").html(min+":"+secSpace+sec);
   
   if(seconds == 30)
      $("#timer").effect("highlight", {"color":"#E77471"}, 5000);
   if(seconds == 20)
      $("#timer").effect("highlight", {"color":"#E77471"}, 5000);
   if(seconds == 10)
      $("#timer").effect("highlight", {"color":"#E77471"}, 5000);
   if(seconds <= 5)
      $("#timer").effect("highlight", {"color":"#E77471"}, 500);
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
   $("#endGame").hide();
   $("#loadSolution").show();
   clearTimeout(timeout);
   clearInterval(interval);
   $('#wordEntry').attr("disabled", true);
   $("#wordEntry").val("Game Over"); 
   $.get("http://localhost:8080/solution?id="+results.Id,function(data){
      solutionWords = $.parseJSON(data);
      $.each(solutionWords,function(i,word){
         if($.inArray(word,correctWords) < 0){
            placeWord(word,true);
            $("#word-"+word).effect("highlight", {"color":"#FFF8C6"}, 5000);
         }
      });
      checkScrollbar();
      $("#loadSolution").hide();
      $("#shake").show();
   });
}

function resizeScreen(){
   var width = $(window).width();
   var height = $(window).height();
   $("#rightColumn").width(width-238-65);
   $("#wordList").width(width-238-65-20);
   $("#wordList").height(height-100);
   
   wordListWidth = $("#wordList").width();
   columns = "" + Math.floor(wordListWidth/85);
   if(columns < 2)
      columns = 2;
   $("#wordList").css("-webkit-column-count",columns);
   checkScrollbar();
}

function checkScrollbar(){
   var before = $("#wordList").scrollLeft();
   $("#wordList").scrollLeft(85);
   if($("#wordList").scrollLeft()<10)
      $("#wordList").css("overflow-x","hidden");
   else
      $("#wordList").css("overflow-x","scroll");
   $("#wordList").scrollLeft(before);
}