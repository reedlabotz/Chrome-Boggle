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

function Board(w, h, rules) {
  this.width = w;
  this.height = h;
  
  //Implement rules later  
}

function boggle_init() {
  board = new Board(4,4,"defaults");
  var i,j;
  
  var board_div = document.createElement("div");
  board_div.id = "board";
  
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
  
  board_div.appendChild(table);
  
  var button = document.createElement("input");
  button.type="button";
  button.value="Shake!";
  button.onclick=shake;
  board_div.appendChild(button);
  
  document.body.appendChild(board_div);
  
  var words = document.createElement("div");
  words.id = "wordlist";
  document.body.appendChild(words);

  shake();
}

function shake() {
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
    });
}

function checkWord(){
   var word = $("#wordEntry").val().toLowerCase();
   $("#wordEntry").val("");
   var hash = Sha1.hash(word + results.Id);
   if($.inArray(hash,results.Words) >= 0){
      console.log("you got one: "+word);
      $("#wordlist").prepend("<div class='word'>" + word + "</div>");
   }
   return false;
}