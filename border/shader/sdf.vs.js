ProgramManager.getInstance().addShader("sdf.vs", `
    
    precision highp float;

    uniform mat4 uWorld;
    uniform mat4 uView;
    uniform mat4 uProj;

    // uVertexScale.xy 椭圆 中心，在 物体空间 的 位置；
    //    例1: aVertexPosition 范围是 [-0.5, 0.5] 变成 200*100 矩形 时，缩放系数 是 vec2(200, 100)
    //    例2: aVertexPosition 范围是 [0, 100] * [0, 200] 变成 100*200 矩形 时，缩放系数 是 vec2(1, 3)
    // 
    // uVertexScale.zw 物体缩放系数
    //    例1: aVertexPosition 范围是 [-0.5, 0.5] 变成 200*100 矩形 时，缩放系数 是 vec2(200, 100)
    //    例2: aVertexPosition 范围是 [0, 100] * [0, 200] 变成 100*200 矩形 时，缩放系数 是 vec2(1, 3)
    uniform vec4 uVertexScale;

    attribute vec2 aVertexPosition;

    varying vec2 vVertexPosition;

    void main() {

        vec2 center = uVertexScale.xy;
        // 椭圆的 中心点 移动到 (0, 0)
        vVertexPosition = uVertexScale.zw * (aVertexPosition) - center;

        gl_Position = uProj * uView * uWorld * vec4(aVertexPosition, 0.0, 1.0);
    }
`);
