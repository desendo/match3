console.log("s");
Level = {};

Level.ShapeTypes = [
    {name: 'circle',points:30},

    {name: 'square',points:10},
    {name: 'triangle',points:20},
    //{name: 'cloud',points:10},
  //  {name: 'star',points:10},
];
Level.Field = {
    cellsByX: 9,
    cellsByY: 9,
    cellSize: 32
};

window.onload = function(){
var app = new PIXI.Application(600, 600, {backgroundColor: 0x222222});
document.body.appendChild(app.view);



var cells = [];
var matches = [];

var points = 0;
var shouldAccountPoints = false;
var isControlEnabled = false;



var field = new PIXI.Container();
app.stage.addChild(field);
field.selectedShape = null;


var pointsDisplay = new PIXI.Text("Очки: "+points, {
    fontFamily: 'sans',
    fill: 'white',
    align: 'left'
});
app.stage.addChild(pointsDisplay);


init();

function Shape(shapeType, x, y) {
    PIXI.Sprite.call(this, PIXI.loader.resources["images/" + shapeType.name + ".png"].texture);

    this.xCoord = x;
    this.yCoord = y;

    this.x = this.xCoord * Level.Field.cellSize;
    this.y = this.yCoord * Level.Field.cellSize;

    this.shapeType = shapeType;
    this.clicked = false;

    this.scale.set(Level.Field.cellSize / this.width,Level.Field.cellSize / this.height);
    field.addChild(this);
    this.interactive = true;
    this.buttonMode = true;


    this.on('pointerdown', handleShapeClick);


};
Shape.prototype = Object.create(PIXI.Sprite.prototype);
Shape.prototype.constructor = Shape;
Shape.prototype.select = function () {
    this.selected = true;
    this.tint = '0xAAAAAA';
};
Shape.prototype.unselect = function () {
    this.selected = false;
    this.tint = '0xFFFFFF';
};
Shape.prototype.checkIfNeighbourShape = function(otherShape) {
    return (Math.abs(this.xCoord-otherShape.xCoord)===1 ) && (this.yCoord===otherShape.yCoord) ||
           (Math.abs(this.yCoord-otherShape.yCoord)===1 && this.xCoord===otherShape.xCoord);
};

function init(){
    preload();
}

function preload() {

    PIXI.loader
        .add(getShapesFileNames())
        .load(create);
}

function create() {
    initField();
    drawField();
    resolveLines();
    shouldAccountPoints = true;//вклюяаем подсчет очков после генерации поля
    update();

}


var timeoutToAdd = 0;
var timeoutToShift = 0;
var shouldShift = false;
var shouldAdd = false;
function update() {
    app.renderer.render(app.stage);
    requestAnimationFrame(update);

    pointsDisplay.text = "Очки: "+points;

    isControlEnabled = !(matches.length>0);

    if(matches.length>0)
    {
        removeMatches();
        shouldShift = true;
    }
    if (shouldShift)
    {
        timeoutToShift+=1;
        if(timeoutToShift>10)
        {
            shiftToBottom();
            shouldAdd = true;
            shouldShift = false;
            timeoutToShift=0;
            findMatches();
        }
    }
    if (shouldAdd)
    {
        timeoutToAdd+=1;
        if(timeoutToAdd>10)
        {
            addNewShapes();
            shouldAdd = false;
            timeoutToAdd = 0;
            findMatches();
        }
    }


    else
        initShapesCoordinates();


}

function initField() {
    initFieldArray();
    populateFieldRandomShapes();

}

function initFieldArray() {
    cells = new Array(Level.Field.cellsByX);
    for (var i = 0; i < Level.Field.cellsByX; i++) {
        cells[i] = new Array(Level.Field.cellsByY);
        cells[i].emptyCellsCount =0;
    }
}

function populateFieldRandomShapes () {
    for (var y = 0; y < Level.Field.cellsByY; y++) {

        for (var x = 0; x < Level.Field.cellsByX; x++) {

            var shape =  new Shape(getRandomShapeType(), x, y);
            cells[x][y] = {};
            cells[x][y].shape = shape;

        }
    }
}

function drawField() {

    field.x = (app.renderer.width - field.width) / 2;
    field.y = (app.renderer.height - field.height) / 2;

}

function getShapesFileNames() {
    var shapesFileNames = [];
    for (var i = 0; i < Level.ShapeTypes.length; i++) {

        shapesFileNames.push("images/" + Level.ShapeTypes[i].name + ".png");

    }
    return shapesFileNames;
}

function getRandomShapeType() {

    var r = getRandomInteger(0, Level.ShapeTypes.length - 1);

    return Level.ShapeTypes[r];
}

function clearSelection() {

    for(var y = 0; y<Level.Field.cellsByY;y++)
    {
        for(var x = 0; x<Level.Field.cellsByX;x++)
        if(cells[x][y].shape!==null)
            cells[x][y].shape.unselect();
    }
    field.selectedShape = null;
}

function getRandomInteger(min, max) {
    var rand = min + Math.random() * (max + 1 - min);

    rand = Math.floor(rand);
    return rand;
}

function handleShapeClick () {

    if(isControlEnabled ) {
        if (field.selectedShape === null) {
            this.select();
            field.selectedShape = this;

        }
        else if (field.selectedShape !== null) {

            if (this.checkIfNeighbourShape(field.selectedShape)) {

                swapShapes(this, field.selectedShape, false);
            }

            clearSelection();


        }
    }

}

function swapShapes(shape1,shape2,restore) {


    cells[shape1.xCoord][shape1.yCoord].shape = shape2;
    cells[shape2.xCoord][shape2.yCoord].shape = shape1;

    var x = shape1.x;
    var y = shape1.y;
    var xCoord = shape1.xCoord;
    var yCoord = shape1.yCoord;


    shape1.x = shape2.x;
    shape1.y = shape2.y;

    shape1.xCoord = shape2.xCoord;
    shape1.xCoord = shape2.xCoord;

    shape2.x = x;
    shape2.y = y;
    shape2.xCoord = xCoord;
    shape2.yCoord = yCoord;


    if(!restore) {
        findMatches();
        if (!(matches.length > 0))
            swapShapes(shape2, shape1,true);
    }


}

function resolveLines() {

    findMatches();

    while (matches.length > 0 ) {

            removeMatches();
            fillEmptyCells();
            findMatches();
    }
}


function findMatches() {

    matches = [];

    findHorizontalMatches();

    findVerticalMatches();

}
function findHorizontalMatches() {

    var isHorizontal = true;
    for (var y=0; y<Level.Field.cellsByY; y++) {

        var matchLength = 1;
        for  (var x=0; x<Level.Field.cellsByX; x++) {

            if (x === Level.Field.cellsByX-1) {
                addMatch(isHorizontal,matchLength, x,y);
                matchLength = 1;
            }
            else {

                if (cells[x][y].shape !== null &&
                    cells[x+1][y].shape !== null &&
                    cells[x][y].shape.shapeType === cells[x+1][y].shape.shapeType
                ) {

                    matchLength += 1;
                }
                else
                {

                    addMatch(isHorizontal,matchLength, x,y);
                    matchLength = 1;
                }
            }

        }
    }
}
function findVerticalMatches() {
    var isHorizontal = false;
    for  (var x=0; x<Level.Field.cellsByX; x++) {

        var matchLength = 1;
        for ( var y=0; y<Level.Field.cellsByY; y++) {

            if (y === Level.Field.cellsByY-1) {
                addMatch(isHorizontal,matchLength, x,y);
                matchLength = 1;
            }
            else {
                if (cells[x][y].shape !== null &&
                    cells[x][y+1].shape !== null &&
                    cells[x][y].shape.shapeType === cells[x][y+1].shape.shapeType
                ) {
                    matchLength += 1;
                }
                else
                {
                    addMatch(isHorizontal,matchLength, x,y);
                    matchLength = 1;
                }
            }

        }
    }
}
function removeMatches() {

    for (var i =0;i<matches.length;i++)
    {
        if(matches[i]!==null)
        {
            removeMatch(matches[i]);
        }
    }
    matches=[];


}
function removeMatch(match) {
    if(match.isHorizontal)

        for(var j = 0;j<match.length;j++) {

            clearCell(match.startX-j,match.startY);
        }

    else

        for(var j = 0;j<match.length;j++) {

            clearCell(match.startX, match.startY - j);
        }
}
function clearCell(x,y) {

    if(cells[x][y].shape !==null) {

        if(shouldAccountPoints)
        {

            points+=cells[x][y].shape.shapeType.points;
        }
        cells[x][y].shape.destroy();
        cells[x][y].shape = null;
        cells[x].emptyCellsCount+=1;
    }

}

function fillEmptyCells(isInitial) {

    shiftToBottom();

    addNewShapes();

}
function shiftToBottom(){

    for  (var x=0; x<Level.Field.cellsByX; x++) {
        if( cells[x].emptyCellsCount>0)
            for ( var y=Level.Field.cellsByY; y>0; y--) {

                    shiftToBottomShape(x,y-1);

            }
        }


    }
function shiftToBottomShape(x, y){
    while(y<Level.Field.cellsByY-1)
    {
        if(cells[x][y].shape!==null && cells[x][y+1].shape===null) {

            cells[x][y].shape.y += Level.Field.cellSize;
            cells[x][y].shape.yCoord++;
            cells[x][y+1].shape=cells[x][y].shape;
            cells[x][y].shape=null;
            console.log("shift", x,y);

        }
        y++;
    }

}
function addNewShapes() {
    for  (var x=0; x<Level.Field.cellsByX; x++) {
        if( cells[x].emptyCellsCount>0)
            for ( var y=0; y<Level.Field.cellsByY; y++) {
                if(cells[x][y].shape===null) {
                    var shape = new Shape(getRandomShapeType(), x, y);
                    cells[x][y] = {};
                    cells[x][y].shape = shape;


                }
            }
    }
}
function addMatch(horizontal, length, x, y){
    if(length>=3) {
        var match = {isHorizontal: horizontal, length: length, startX: x, startY: y};
        matches.push(match);
    }
}

function initShapesCoordinates() {
    for (var y=0; y<Level.Field.cellsByY; y++) {


        for  (var x=0; x<Level.Field.cellsByX; x++) {

            if (cells[x][y].shape!==null) {
                cells[x][y].shape.xCoord =x;
                cells[x][y].shape.yCoord =y;
            }


        }
    }

}
}
