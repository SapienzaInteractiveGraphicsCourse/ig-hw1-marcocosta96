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

var near = 0.1;
var far = 5.0;
var radius = 1.0;
var theta  = 0.0;
var phi    = 0.0;

var fovy = 90.0;

//Scaling
var scaling = 0.5;
//Translations
var translX = 0.0, translY = 0.0, translZ = 0.0;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, scalingMatrixLoc, translationMatrixLoc;

//Camera position
var eye;
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

//light
var lightPosition = vec4(2.0, 2.0, 2.0, 0.0);
var lightAmbient = vec4(0.1, 0.1, 0.1, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

//material
var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 0.8, 0.4, 0.2, 1.0);
var materialSpecular = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialShininess = 20.0;

//shading
var shadingModel = true;

//texture
var texSize = 64;
var texCoordsArray = [];
// Create a checkerboard pattern using floats
var image1 = new Array()
for (var i =0; i<texSize; i++)  image1[i] = new Array();
for (var i =0; i<texSize; i++)
    for ( var j = 0; j < texSize; j++)
       image1[i][j] = new Float32Array(4);
for (var i =0; i<texSize; i++) for (var j=0; j<texSize; j++) {
    var c = (((i & 0x8) == 0) ^ ((j & 0x8)  == 0));
    image1[i][j] = [c, c, c, 1];
}
// Convert floats to ubytes for texture
var image2 = new Uint8Array(4*texSize*texSize);
for ( var i = 0; i < texSize; i++ )
    for ( var j = 0; j < texSize; j++ )
       for(var k =0; k<4; k++)
            image2[4*texSize*i+4*j+k] = 255*image1[i][j][k];
var texCoord = [
    vec2(0, 0),
    vec2(0, 1),
    vec2(1, 1),
    vec2(1, 0)
];
function configureTexture(image) {
    var texture = gl.createTexture();
    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
}

function quad(a, b, c, d) {
    var t1 = subtract(vertices[b], vertices[a]);
    var t2 = subtract(vertices[c], vertices[b]);
    var normal = cross(t1, t2);
    var normal = vec3(normal);

    pointsArray.push(vertices[a]);
    texCoordsArray.push(texCoord[0]);
    normalsArray.push(normal);

    pointsArray.push(vertices[b]);
    texCoordsArray.push(texCoord[1]);
    normalsArray.push(normal);

    pointsArray.push(vertices[c]);
    texCoordsArray.push(texCoord[2]);
    normalsArray.push(normal);

    pointsArray.push(vertices[a]);
    texCoordsArray.push(texCoord[0]);
    normalsArray.push(normal);

    pointsArray.push(vertices[c]);
    texCoordsArray.push(texCoord[2]);
    normalsArray.push(normal);

    pointsArray.push(vertices[d]);
    texCoordsArray.push(texCoord[3]);
    normalsArray.push(normal);
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
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    colorCube();

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    scalingMatrixLoc = gl.getUniformLocation(program, "scalingMatrix");
    translationMatrixLoc = gl.getUniformLocation(program, "translMatrix");

    var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);

    gl.uniform4fv(gl.getUniformLocation(program, "vAmbientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "vDiffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "vSpecularProduct"), flatten(specularProduct));
    gl.uniform1f(gl.getUniformLocation(program, "vShininess"), materialShininess);

    gl.uniform4fv(gl.getUniformLocation(program, "fAmbientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "fDiffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "fSpecularProduct"), flatten(specularProduct));
    gl.uniform1f(gl.getUniformLocation(program, "fShininess"), materialShininess);

    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));

    //Controllers
    document.getElementById("NearSlider").oninput = function(event) {
        near =this.valueAsNumber;
        document.getElementById('labelNear').innerText = this.valueAsNumber;
    };
    document.getElementById("FarSlider").oninput = function(event) {
        far = this.valueAsNumber;
        document.getElementById('labelFar').innerText = this.valueAsNumber;
    };
    document.getElementById("thetaSlider").oninput = function(event) {
        theta = event.target.value * Math.PI/180.0;
        document.getElementById('labelTheta').innerText = this.valueAsNumber;
    };
    document.getElementById("phiSlider").oninput = function(event) {
        phi = event.target.value * Math.PI/180.0;
        document.getElementById('labelPhi').innerText = this.valueAsNumber;
    };
    document.getElementById("ScaleSlider").oninput = function() {
        scaling = this.valueAsNumber;
        document.getElementById('labelScaling').innerText = this.valueAsNumber;
    };
    document.getElementById("FovSlider").oninput = function() {
        fovy = this.valueAsNumber;
        document.getElementById('labelFov').innerText = this.valueAsNumber;
    };
    document.getElementById("TranslateXSlider").oninput = function() {
        translX = this.valueAsNumber;
        document.getElementById('labelX').innerText = this.valueAsNumber;
    };
    document.getElementById("TranslateYSlider").oninput = function() {
        translY = this.valueAsNumber;
        document.getElementById('labelY').innerText = this.valueAsNumber;
    };
    document.getElementById("TranslateZSlider").oninput = function() {
        translZ = this.valueAsNumber;
        document.getElementById('labelZ').innerText = this.valueAsNumber;
    };
    document.getElementById("ButtonShadingModel").onclick = function() {
        shadingModel = !shadingModel;
        if (shadingModel) {
            document.getElementById('currentModel').innerText = "Current Shading Model: Phong";
        }
        else {
            document.getElementById('currentModel').innerText = "Current Shading Model: Gouraud";
        }
    };

    //Texture
    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    configureTexture(image2);

    render();
};

var render = function() {

    var translationMatrix = [
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        translX, translY, translZ, 1.0
    ];

    var scalingMatrix = [
        scaling, 0.0, 0.0, 0.0,
        0.0, scaling, 0.0, 0.0,
        0.0, 0.0, scaling, 0.0,
        0.0, 0.0, 0.0, 1.0
    ];

    //Camera
    eye = vec3(radius * Math.sin(phi), radius * Math.sin(theta), radius * Math.cos(phi));
    modelViewMatrix = lookAt(eye, at , up);
    projectionMatrix = ortho(-1.0, 1.0, -1.0, 1.0, near, far);
    gl.clearColor(0.2, 0.2, 0.2, 1);

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    scalingMatrixLoc = gl.getUniformLocation(program, "scalingMatrix");
    translationMatrixLoc = gl.getUniformLocation(program, "translationMatrix");

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
    gl.uniformMatrix4fv(scalingMatrixLoc, false, flatten(scalingMatrix));
    gl.uniformMatrix4fv(translationMatrixLoc, false, translationMatrix);

    //Divide canvas in two parts
    const width = gl.canvas.width;
    const height = gl.canvas.height;
    const displayWidth = gl.canvas.clientWidth;
    const displayHeight = gl.canvas.clientHeight;
    const dispWidth = displayWidth / 2;
    const dispHeight = displayHeight;
    const aspect = dispWidth/dispHeight;

    gl.enable(gl.SCISSOR_TEST);

    //Render left part
    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.scissor(0,  0, width/2, height);
    gl.viewport(0,  0, width/2, height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);

    //Render right part
    projectionMatrix = perspective(fovy, aspect, near, far);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    gl.clearColor(0.2, 0.2, 0.2, 1);
    gl.scissor(width/2, 0, width/2, height);
    gl.viewport(width/2, 0, width/2, height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);

    gl.uniform1i(gl.getUniformLocation(program, "shadingModel"), shadingModel);

    requestAnimationFrame(render);
}
