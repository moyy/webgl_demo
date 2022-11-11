ProgramManager.getInstance().addShader("sdf_rect.fs", `

    #extension GL_OES_standard_derivatives : require

    precision highp float;

    // 颜色
    uniform vec4 uColor;

    // 矩形 半宽，半高
    uniform vec2 uExtent;

    
    // uVertexScale.xy 椭圆 中心，在 物体空间 的 位置；
    //    例1: aVertexPosition 范围是 [-0.5, 0.5] 变成 200*100 矩形 时，缩放系数 是 vec2(200, 100)
    //    例2: aVertexPosition 范围是 [0, 100] * [0, 200] 变成 100*200 矩形 时，缩放系数 是 vec2(1, 3)
    // 
    // uVertexScale.zw 物体缩放系数
    //    例1: aVertexPosition 范围是 [-0.5, 0.5] 变成 200*100 矩形 时，缩放系数 是 vec2(200, 100)
    //    例2: aVertexPosition 范围是 [0, 100] * [0, 200] 变成 100*200 矩形 时，缩放系数 是 vec2(1, 3)
    uniform vec4 uVertexScale;

    varying vec2 vVertexPosition;

    // 返回 coord 到 矩形 最短距离, 负值表示 在里面, 正值表示在外面
    // 
    float sdfRect(vec2 xy, vec2 wh)
    {
        vec2 d = abs(xy) - wh;
        return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
    }

    // 根据 d, 抗锯齿, 返回 alpha值

    float antialiase(float d) 
    {
        // TODO: 以后 发现 还有锯齿 或者 太模糊 时，可以将 1.0 曝露到 uniform 设置
        float anti = 1.0 * fwidth(d);
        
        // smoothstep(-a, a, d) 意思是 根据 d-值 将 [-a, a] 平滑到 [0, 1] 中
        // d < -a, 全内部, 得到0, 这时期望 alpha = 1.0
        // d > a, 全外部, 得到1, 这时期望 alpha = 0.0
        
        return 1.0 - smoothstep(-anti, anti, d);
    }

    void main() {
        vec2 pos = uVertexScale.zw * vVertexPosition - uVertexScale.xy;
        float d = sdfRect(pos, uExtent);
        gl_FragColor = vec4(1.0, 0.0, 0.0, 0.5);
    }
    
    `);