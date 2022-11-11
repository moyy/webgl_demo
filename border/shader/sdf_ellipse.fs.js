ProgramManager.getInstance().addShader("sdf_ellipse.fs", `

    #extension GL_OES_standard_derivatives : require

    precision highp float;

    // 颜色
    uniform vec4 uColor;

    // 椭圆 a, b
    uniform vec2 uEllipseAB;

    varying vec2 vVertexPosition;

    // 
    // TODO 当 a，b 的 值 相差 过大时，会 不准确
    // 
    float sdfEllipseSimple(vec2 xy, vec2 ab)
    {
        // 求 (1/a, 1/b)
        vec2 recAB = 1.0 / ab;

        // 求 (x/a, y/b) = (x, y) * (1/a, 1/b)
        vec2 scale = xy * recAB;
        
        // 椭圆值 f = (x/a)^2 + (y/b)^2 - 1
        return dot(scale, scale) - 1.0;
    }

    // 
    // TODO 椭圆中心 的 区域，用这个算法 会有 接近 0 的 alpha值
    // 
    // 这里用到是标准椭圆方程, x^2/a^2 + y^2/b^2 = 1
    // 中心在(0, 0), 半长轴为 a, 半短轴为 b
    // 返回 coord 到 椭圆的 最短距离, 负值表示 在里面, 正值表示在外面
    // 
    // 该实现 采用 雅可比 近似 算法, d = f / length(f-梯度)
    //      在实际 d 为 正负 1 附近时，精度高；
    //      实际上，抗锯齿 也需要 这样的特性
    //
    // 对 椭圆 来说
    //    f = (x/a)^2 + (y/b)^2 - 1 = dot[(x/a, y/b), (x/a, y/b)] - 1.0
    //    f-梯度: g = (2x/a^2, 2y/b^2) = 2 * (x/a, y/b) * (1/a, 1/b)
    //    length(g) = sqrt(dot(g, g))
    //    1 / length(g) = 1 / sqrt(dot(g, g)) = inversesqrt(dot(g, g))
    //
    // 参考 http://www.essentialmath.com/GDC2015/VanVerth_Jim_DrawingAntialiasedEllipse.pdf

    float sdfEllipse(vec2 xy, vec2 ab)
    {
        // 求 (1/a, 1/b)
        vec2 recAB = 1.0 / ab;

        // 求 (x/a, y/b) = (x, y) * (1/a, 1/b)
        vec2 scale = xy * recAB;
        
        // 椭圆值 f = (x/a)^2 + (y/b)^2 - 1
        float f = dot(scale, scale) - 1.0;

        // 梯度 g = 2.0 * (x/a, y/b) * (1/a, 1/b)
        vec2 g = 2.0 * scale * recAB;
        
        // 1 / length(g) = inversesqrt(dot(g, g))

        return f * inversesqrt(dot(g, g));
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
    
    uniform vec4 uVertexScale;

    void main() {
        vec2 pos = uVertexScale.zw * vVertexPosition - uVertexScale.xy;
        float d = sdfEllipseSimple(pos, uEllipseAB);
        
        float a = antialiase(d);
        
        gl_FragColor = vec4(uColor.rgb, a * uColor.a);
    }
    `);