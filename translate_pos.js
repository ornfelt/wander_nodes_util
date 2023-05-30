function _pos() {
  this.x = 0;
  this.y = 0;
}

function get_player_position(x,y,m)
{
 pos = new _pos();
 where_530 = 0;
 x = Math.round(x);
 y = Math.round(y);
 if(m == 530) {
   if(y < -1000 && y > -10000 && x > 5000) { //BE
     x=x-10349; y=y+6357; where_530 = 1;
     }
   else if(y < -7000 && x < 0) {             //Dr
     x=x+3961; y=y+13931; where_530 = 2;
     }
   else {                                    //Outland
     x=x-3070; y=y-1265; where_530 = 3;
     }
   }
 else if(m == 609) {
   x=x-2355; y=y+5662;
   }
 if(where_530 == 3) { //Outland
   xpos = Math.round(x * 0.051446);
   ypos = Math.round(y * 0.051446);
   }
 else if(m == 571) { //Northrend
   xpos = Math.round(x * 0.050085);
   ypos = Math.round(y * 0.050085);
   }
 else {              //Azeroth
   xpos = Math.round(x * 0.025140);
   ypos = Math.round(y * 0.025140);
   }
 switch (m) {
   case '530':
    if(where_530 == 1) {
      pos.x = 858 - ypos; pos.y = 84 - xpos;
      }
    else if(where_530 == 2) {
      pos.x = 103 - ypos; pos.y = 261 - xpos;
      }
    else if(where_530 == 3) {
      pos.x = 684 - ypos; pos.y = 229 - xpos;
      }
    break;
   case '571':
    pos.x = 505 - ypos;
    pos.y = 642 - xpos;
    break;
   case '609':
    pos.x = 896 - ypos;
    pos.y = 232 - xpos;
    break;
   case '1':
    pos.x = 194 - ypos;
    pos.y = 398 - xpos;
    break;
   case '0':
    pos.x = 752 - ypos;
    pos.y = 291 - xpos;
    break;
   default:
    pos.x = 194 - ypos;
    pos.y = 398 - xpos;
 }
 return pos;
}

console.log(get_player_position(-2105.56,6746.75,530));
console.log(get_player_position(-2288.2,6747.21,530));
console.log(get_player_position(-2473.95,6475.78,530));