"use strict";

var canvas;
var gl;

var numVertices  = 36;

var numChecks = 8;

var program;

var c;

var flag = true;

var pointsArray = [];
var normalsArray = [];

var vertices = [
    vec4( -0.5, -0.5,  0.5, 1.0 ),
    vec4( -0.5,  0.5,  0.5, 1.0 ),
    vec4( 0.5,  0.5,  0.5, 1.0 ),
    vec4( 0.5, -0.5,  0.5, 1.0 ),
    vec4( -0.5, -0.5, -0.5, 1.0 ),
    vec4( -0.5,  0.5, -0.5, 1.0 ),
    vec4( 0.5,  0.5, -0.5, 1.0 ),
    vec4( 0.5, -0.5, -0.5, 1.0 )
];

/*
var vertexColors = [
    vec4( 0.0, 0.0, 0.0, 1.0 ),  // black
    vec4( 1.0, 0.0, 0.0, 1.0 ),  // red
    vec4( 1.0, 1.0, 0.0, 1.0 ),  // yellow
    vec4( 0.0, 1.0, 0.0, 1.0 ),  // green
    vec4( 0.0, 0.0, 1.0, 1.0 ),  // blue
    vec4( 1.0, 0.0, 1.0, 1.0 ),  // magenta
    vec4( 0.0, 1.0, 1.0, 1.0 ),  // white
    vec4( 0.0, 1.0, 1.0, 1.0 )   // cyan
];
*/

var near = 0.3;
var far = 3.0;
var radius = 2.0;
var theta  = 45.0;
var phi    = 45.0;
var dr = 5.0 * Math.PI/180.0;

var  fovy = 45.0;  // Field-of-view in Y direction angle (in degrees)
var  aspect = 1.0;       // Viewport aspect ratio
var scaling = 1.0;    // Scaling transformation value
var translX = 0.0;
var translY = 0.0;
var translZ = 0.0;

var changeShading = true;

var lightPosition = vec4(1.0, 1.0, 1.0, 0.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialShininess = 100.0;

var ambientColor, diffuseColor, specularColor;

var modelViewMatrix, projectionMatrixLeft, projectionMatrixRight, scalingMatrix, translMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, scalingMatrixLoc, translMatrixLoc;
//var shadingModelLoc;

var eye;
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

var texSize = 64;

// Create a checkerboard pattern using floats
var image1 = new Array()
for (var i =0; i<texSize; i++)
    image1[i] = new Array();
for (var i =0; i<texSize; i++)
    for ( var j = 0; j < texSize; j++)
        image1[i][j] = new Float32Array(4);
for (var i =0; i<texSize; i++)
    for (var j=0; j<texSize; j++) {
        var c = (((i & 0x8) == 0) ^ ((j & 0x8)  == 0));
        image1[i][j] = [c, c, c, 1];
    }

// Convert floats to ubytes for texture
var image2 = new Uint8Array(4*texSize*texSize);
for ( var i = 0; i < texSize; i++ )
    for ( var j = 0; j < texSize; j++ )
       for(var k =0; k<4; k++)
            image2[4*texSize*i+4*j+k] = 255*image1[i][j][k];

var texCoordsArray = [];
var texCoord = [
    vec2(0,0),
    vec2(0,1),
    vec2(1,1),
    vec2(1,0)
];

function configureTexture(image) {
    var texture = gl.createTexture();
    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
        gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
}

function quad(a, b, c, d) {
    var t1 = subtract(vertices[b], vertices[a]);
    var t2 = subtract(vertices[c], vertices[b]);
    var normal = cross(t1, t2);
    var normal = vec3(normal);

    pointsArray.push(vertices[a]);
    normalsArray.push(normal);
    texCoordsArray.push(texCoord[0]);

    pointsArray.push(vertices[b]);
    normalsArray.push(normal);
    texCoordsArray.push(texCoord[1]);

    pointsArray.push(vertices[c]);
    normalsArray.push(normal);
    texCoordsArray.push(texCoord[2]);

    pointsArray.push(vertices[a]);
    normalsArray.push(normal);
    texCoordsArray.push(texCoord[0]);

    pointsArray.push(vertices[c]);
    normalsArray.push(normal);
    texCoordsArray.push(texCoord[2]);

    pointsArray.push(vertices[d]);
    normalsArray.push(normal);
    texCoordsArray.push(texCoord[3]);
}

function colorCube() {
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );
}


window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    aspect = canvas.width/canvas.height;
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    colorCube();

    var nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW );

    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    var tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW );

    var vTexCoord = gl.getAttribLocation( program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    configureTexture(image2);

    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    scalingMatrixLoc = gl.getUniformLocation(program, "scalingMatrix");
    translMatrixLoc = gl.getUniformLocation(program, "translMatrix");

    var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);

    // sliders for viewing parameters

    document.getElementById("zFarSlider").oninput = function(event) {
        far = event.target.value;
    };
    document.getElementById("zNearSlider").oninput = function(event) {
        near = event.target.value;
    };
    document.getElementById("radiusSlider").oninput = function(event) {
       radius = event.target.value;
    };
    document.getElementById("thetaSlider").oninput = function(event) {
        theta = event.target.value* Math.PI/180.0;
    };
    document.getElementById("phiSlider").oninput = function(event) {
        phi = event.target.value* Math.PI/180.0;
    };
    document.getElementById("fovSlider").oninput = function(event) {
        fovy = event.target.value;
    };
    document.getElementById("scaleSlider").oninput = function(event) {
        scaling = event.target.value;
    };
    document.getElementById("traslationSliderX").oninput = function(event) {
        translX = event.target.value;
    };
    document.getElementById("traslationSliderY").oninput = function(event) {
        translY = event.target.value;
    };
    document.getElementById("traslationSliderZ").oninput = function(event) {
        translZ = event.target.value;
    };
    document.getElementById("ShadingButton").onclick = function(){
        changeShading = !changeShading;
        if(changeShading) {
            document.getElementById("currentShadingModel").innerText = "Gouraud";
        }
        else {
            document.getElementById("currentShadingModel").innerText = "Phong";
        }
    };

    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"),flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct) );
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition) );

    gl.uniform1f(gl.getUniformLocation(program, "shininess"),materialShininess);

    render();
}

var render = function() {

    const width = gl.canvas.width;
    const height = gl.canvas.height;
    const displayWidth = gl.canvas.clientWidth;
    const displayHeight = gl.canvas.clientHeight;

    // render left part
    const dispWidthLeft = displayWidth / 2;
    const dispHeightLeft = displayHeight;
    const aspectLeft = dispWidthLeft/dispHeightLeft;
    projectionMatrixLeft = perspective(fovy, aspectLeft, near, far);
    gl.clearColor(0.1, 0.1, 0.1, 1);
    renderSinglePart(0, 0, width/2, height, projectionMatrixLeft);

    //render right part
    const dispWidthRight = displayWidth / 2;
    const dispHeightRight = displayHeight;
    const aspectRight = dispWidthRight/dispHeightRight;
    const top = 1, bottom = -1;
    const right = top * aspectRight, left = bottom * aspectRight;
    projectionMatrixRight = ortho(left, right, bottom, top, near, far);
    gl.clearColor(0.2, 0.2, 0.2, 1);
    renderSinglePart(width/2, 0, width/2, height, projectionMatrixRight);

    gl.uniform1f(gl.getUniformLocation(program, "changeShading"),changeShading);

    requestAnimFrame(render);
}

function renderSinglePart(startX, startY, lenghtWidth, lenghtHeight, projMatrix) {
    gl.enable(gl.SCISSOR_TEST);
    gl.viewport(startX, startY, lenghtWidth, lenghtHeight);
    gl.scissor(startX, startY, lenghtWidth, lenghtHeight);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    eye = vec3(radius*Math.sin(theta)*Math.cos(phi), radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));
    modelViewMatrix = lookAt(eye, at , up);
    scalingMatrix = scalem(scaling, scaling, scaling);
    translMatrix = translate(translX, translY, translZ);

    gl.uniformMatrix4fv( scalingMatrixLoc, false, flatten(scalingMatrix) );
    gl.uniformMatrix4fv( translMatrixLoc, false, flatten(translMatrix) );
    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projMatrix) );

    gl.drawArrays( gl.TRIANGLES, 0, numVertices );
}
