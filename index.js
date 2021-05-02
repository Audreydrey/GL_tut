import vert from '!raw-loader!./vertex.glsl';
import frag from '!raw-loader!./fragment.glsl';
"use strict";

function main() {
  var image = new Image();
  image.src = "glasses-large.png"; // MUST BE SAME DOMAIN!!!

  image.onload = function() {
    render(image);
  };
}

function render(image) {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  var canvas = document.querySelector("#canvas");
  var gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  var ext = gl.getExtension("OES_texture_float_linear");
  if (!ext) {
    // sorry, can't filter floating point textures
    alert("can't filter floating point textures");
  }

  var ext = gl.getExtension("EXT_color_buffer_float");
  if (!ext) {
    // sorry, can't render to floating point textures
    alert("can't render to floating point textures");
  }


  // setup GLSL program
  var program = webglUtils.createProgramFromSources(gl, [vert, frag]);
  webglUtils.resizeCanvasToDisplaySize(gl.canvas, 3); //canvas & multiplier
  console.log(window.devicePixelRatio);  //2
  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, "a_position");
  var texcoordLocation = gl.getAttribLocation(program, "a_texCoord");

  // Create a buffer to put three 2d clip space points in
  var positionBuffer = gl.createBuffer();
  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // Set a rectangle the same size as the image.
  var h = image.height;
  var w = image.width;
  setRectangle( gl, 0, 0, w, h);
  console.log(w); //320
  console.log(h); //428


  // provide texture coordinates for the rectangle.
  var texcoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0.0,  0.0,
      w,  0.0,
      0.0,  h,
      0.0,  h,
      w,  0.0,
      w,  h,
  ]), gl.STATIC_DRAW);

  function createAndSetupTexture(gl, texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set up texture so we can render any size image and so we are
    // working with pixels.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return texture;
  }
  // Create a texture and put the image in it.
  var originalTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  var originalImageTexture = createAndSetupTexture(gl, originalTex);
  // void gl.texImage2D(target, level, internalformat, width, height, border, format, type, ImageData source);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F,image.width, image.height,
    0,  gl.RGBA, gl.FLOAT, image);

  //create Alternative texture
  var msgTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  var msgTexture = createAndSetupTexture(gl, msgTex);
  var b = new ArrayBuffer(image.height * image.width * 4 * 4);
  var msg = new Float32Array(b);

  for (var i = 0; i < image.height * image.width; i++ ){
      msg[i * 4] = 0.05;
      msg[i * 4 + 1] = 0.05;
      msg[i * 4 + 2] = 0.1;
  }
   
  console.log(image.height * image.width * 4)
  console.log(msg.length)
  // void gl.texImage2D(target, level, internalformat, width, height, 
  // border, format, type, ArrayBufferView srcData, srcOffset);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, image.width, image.height, 
    0, gl.RGBA, gl.FLOAT, msg, 0);


  console.log(gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)); //80

  // var drawbufExt = gl.getExtension('WEBGL_draw_buffers')
  console.log(gl.getParameter(gl.MAX_COLOR_ATTACHMENTS));//8
  console.log(gl.getParameter(gl.MAX_DRAW_BUFFERS));//8


  // create 2 textures and attach them to framebuffers.
  var textures = [];
  var framebuffers = [];
  for (var ii = 0; ii < 2; ++ii) {
    var tex = gl.createTexture();
    var texture = createAndSetupTexture(gl, tex);
    textures.push(texture);

    // make the texture the same size as the image
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA32F, image.width, image.height, 0,
        gl.RGBA, gl.FLOAT, null);

    // Create a framebuffer
    var fbo = gl.createFramebuffer();
    framebuffers.push(fbo);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    // Attach a texture to it.
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  }


  // lookup uniforms
  var resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  var textureSizeLocation = gl.getUniformLocation(program, "u_textureSize");
  var kernelLocation = gl.getUniformLocation(program, "u_kernel[0]");
  var kernelWeightLocation = gl.getUniformLocation(program, "u_kernelWeight");
  var flipYLocation = gl.getUniformLocation(program, "u_flipY");

  // Define several convolution kernels
  var kernels = {
    normal: [
      0, 0, 0,
      0, 1, 0,
      0, 0, 0
    ],
    gaussianBlur: [
      0.045, 0.122, 0.045,
      0.122, 0.332, 0.122,
      0.045, 0.122, 0.045
    ],
    gaussianBlur2: [
      1, 2, 1,
      2, 4, 2,
      1, 2, 1
    ],
    
    unsharpen: [
      -1, -1, -1,
      -1,  9, -1,
      -1, -1, -1
    ],
    sharpen: [
       -1, -1, -1,
       -1, 16, -1,
       -1, -1, -1
    ],
    edgeDetect: [
       -0.125, -0.125, -0.125,
       -0.125,  1,     -0.125,
       -0.125, -0.125, -0.125
    ],
    sobelHorizontal: [
        1,  2,  1,
        0,  0,  0,
       -1, -2, -1
    ],
    emboss: [
       -2, -1,  0,
       -1,  1,  1,
        0,  1,  2
    ]
  };

  var effects = [
    { name : "normal"},
    { name: "gaussianBlur"},
    { name: "gaussianBlur2" , on:true},
    { name: "unsharpen", },
    { name: "sharpen", },
    { name: "emboss",  },
    { name: "edgeDetect", },
    { name: "sobelHorizontal", },
  ];

  // Setup a ui.
  var ui = document.querySelector("#ui");
  var table = document.createElement("table");
  var tbody = document.createElement("tbody");
  for (var ii = 0; ii < effects.length; ++ii) {
    var effect = effects[ii];
    var tr = document.createElement("tr");
    var td = document.createElement("td");
    var chk = document.createElement("input");
    chk.value = effect.name;
    chk.type = "checkbox";
    if (effect.on) {
      chk.checked = "true";
    }
    chk.onchange = drawEffects;
    td.appendChild(chk);
    td.appendChild(document.createTextNode('≡ ' + effect.name));
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  ui.appendChild(table);
  $(table).tableDnD({onDrop: drawEffects});

  drawEffects();

  function computeKernelWeight(kernel) {
    var weight = kernel.reduce(function(prev, curr) {
        return prev + curr;
    });
    return weight <= 0 ? 1 : weight;
  }

  function drawEffects(name) {

    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    var u_imgLoc = gl.getUniformLocation(program, "u_image");
    var msgsLoc = gl.getUniformLocation(program, "msgs");

    gl.uniform1i(u_imgLoc, 0);  // texture unit 0
    gl.uniform1i(msgsLoc, 1); 

    // Turn on the position attribute
    gl.enableVertexAttribArray(positionLocation);

    // Bind the position buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        positionLocation, size, type, normalize, stride, offset);

    // Turn on the texcoord attribute
    gl.enableVertexAttribArray(texcoordLocation);

    // bind the texcoord buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);

    // Tell the texcoord attribute how to get data out of texcoordBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        texcoordLocation, size, type, normalize, stride, offset);

    // set the size of the image
    gl.uniform2f(textureSizeLocation, image.width, image.height);
    
    //bind 2 textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, originalImageTexture);
    
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, msgTexture);

    // don't y flip images while drawing to the textures
    gl.uniform1f(flipYLocation, 1);

    // loop through each effect we want to apply.
    var count = 0;
    for (var ii = 0; ii < tbody.rows.length; ++ii) {
      var checkbox = tbody.rows[ii].firstChild.firstChild;
      if (checkbox.checked) {
        // Setup to draw into one of the framebuffers.
        setFramebuffer(framebuffers[count % 2], image.width, image.height);

        drawWithKernel(checkbox.value);



        // var result = new ArrayBuffer(image.height * image.width * 4);
        var resultArray = new Float32Array(image.height * image.width * 4);
        gl.readPixels(0, 0, 5,5,gl.RGBA, gl.FLOAT, resultArray); //read 25 RGBA texels
        console.log(resultArray);

        gl.activeTexture(gl.TEXTURE0);
        // for the next draw, use the texture we just rendered to.
        gl.bindTexture(gl.TEXTURE_2D, textures[count % 2]);

        // increment count so we use the other texture next time.
        ++count;
      }
    }
    console.log(gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT)); //6408 : RGBA
    console.log(gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE));// 5121 : unsign byte

    


    // finally draw the result to the canvas.
    gl.uniform1f(flipYLocation, -1);  // need to y flip for canvas
    setFramebuffer(null, gl.canvas.width, gl.canvas.height);
    drawWithKernel("normal");
  }

  function setFramebuffer(fbo, width, height) {
    // make this the framebuffer we are rendering to.
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    // Tell the shader the resolution of the framebuffer.
    gl.uniform2f(resolutionLocation, width, height);

    // Tell webgl the viewport setting needed for framebuffer.
    gl.viewport(0, 0, width, height);
  }


  function drawWithKernel(name) {
    // set the kernel and it's weight
    gl.uniform1fv(kernelLocation, kernels[name]);
    gl.uniform1f(kernelWeightLocation, computeKernelWeight(kernels[name]));

    // Draw the rectangle.
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 6;
    gl.drawArrays(primitiveType, offset, count);
  }
}

function setRectangle(gl, x, y, width, height) {
  var x1 = x;
  var x2 = x + width;
  var y1 = y;
  var y2 = y + height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
     x1, y1,
     x2, y1,
     x1, y2,
     x1, y2,
     x2, y1,
     x2, y2,
  ]), gl.STATIC_DRAW);
}
function requestCORSIfNotSameOrigin(img, url) {
  if ((new URL(url)).origin !== window.location.origin) {
    img.crossOrigin = "";
  }
}
main();