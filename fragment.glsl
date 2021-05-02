

precision mediump float;

// our texture
uniform sampler2D u_image;// h * w
uniform sampler2D msgs; // alternative psudo texture, store messages
uniform vec2 u_textureSize; //(img.width, img.height)
uniform float u_kernel[9];
uniform float u_kernelWeight;

// the texCoords passed in from the vertex shader.
varying vec2 v_texCoord; 
// out vec4 outcolor;

void main() {
    vec4 msg = texture2D(msgs, v_texCoord);
    // vec4 c = texture2D(u_image, v_texCoord);

    vec2 onePixel = vec2(1.0, 1.0) / u_textureSize;
    // v_texCoord is the actual pixel coord
    vec2 v_tex = v_texCoord /  u_textureSize; 
    vec4 colorSum =
        texture2D(u_image, v_tex + onePixel * vec2(-1, -1)) * u_kernel[0] +
        texture2D(u_image, v_tex + onePixel * vec2( 0, -1)) * u_kernel[1] +
        texture2D(u_image, v_tex + onePixel * vec2( 1, -1)) * u_kernel[2] +
        texture2D(u_image, v_tex + onePixel * vec2(-1,  0)) * u_kernel[3] +
        texture2D(u_image, v_tex + onePixel * vec2( 0,  0)) * u_kernel[4] +
        texture2D(u_image, v_tex + onePixel * vec2( 1,  0)) * u_kernel[5] +
        texture2D(u_image, v_tex + onePixel * vec2(-1,  1)) * u_kernel[6] +
        texture2D(u_image, v_tex + onePixel * vec2( 0,  1)) * u_kernel[7] +
        texture2D(u_image, v_tex + onePixel * vec2( 1,  1)) * u_kernel[8] ;
    // float blue = c.b + msg.b;
    gl_FragColor = vec4((colorSum / u_kernelWeight).rgb, 1.0);

}