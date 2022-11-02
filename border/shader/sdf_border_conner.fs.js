ProgramManager.getInstance().addShader("sdf_border_conner.fs", `

    #extension GL_OES_standard_derivatives : require

    precision mediump float;

    // 颜色
    uniform vec4 uColor;

    // 小椭圆 a, b; 大椭圆 a, b
    uniform vec4 uEllipseAB;

    varying vec2 vVertexPosition;

    // TODO 当 a，b 的 值 相差 过大时，会 不准确
    float sdfEllipseSimple(vec2 xy, vec2 ab)
    {
        // 求 (1/a, 1/b)
        vec2 recAB = 1.0 / ab;

        // 求 (x/a, y/b) = (x, y) * (1/a, 1/b)
        vec2 scale = xy * recAB;
        
        // 椭圆值 f = (x/a)^2 + (y/b)^2 - 1
        return dot(scale, scale) - 1.0;
    }

    float antialiase_between(float small_d, float big_d) 
    {
        float anti_big_d = 1.0 * fwidth(big_d);
        float a_big = 1.0 - smoothstep(-anti_big_d, anti_big_d, big_d);

        float anti_small_d = 1.0 * fwidth(small_d);
        float a_small = 1.0 - smoothstep(-anti_small_d, anti_small_d, small_d);

        return a_big - a_small;
    }

    void main() {
        vec2 small = uEllipseAB.xy;
        float small_d = sdfEllipseSimple(vVertexPosition, small);
        
        vec2 big = uEllipseAB.zw;
        float big_d = sdfEllipseSimple(vVertexPosition, big);

        float a = antialiase_between(small_d, big_d);
        
        gl_FragColor = vec4(uColor.rgb, a * uColor.a);

        // gl_FragColor = uColor;
    }
    `);