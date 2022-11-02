ProgramManager.getInstance().addShader("sdf_circle.fs", `

    #extension GL_OES_standard_derivatives : require

    precision mediump float;

    // 颜色
    uniform vec4 uColor;

    // 圆 半径
    uniform float uRadius;

    varying vec2 vVertexPosition;

    // 返回 coord 到 圆的 最短距离, 负值表示 在里面, 正值表示在外面
    
    float sdfCircle(vec2 xy, float r)
    {
        return length(xy) - r;
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
        float d = sdfCircle(vVertexPosition, uRadius);
        
        float a = antialiase(d);
        
        gl_FragColor = vec4(uColor.rgb, a * uColor.a);
    }
    `);