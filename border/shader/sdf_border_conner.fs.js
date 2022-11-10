ProgramManager.getInstance().addShader("sdf_border_conner.fs", `

    #extension GL_OES_standard_derivatives : require

    precision highp float;

    // 颜色
    uniform vec4 uColor;

    // 小椭圆 a, b; 大椭圆 a, b
    uniform vec4 uEllipseAB;

    varying vec2 vVertexPosition;

    vec3 computeGradientColor(vec2 local) {

        mat4 u_gradientMat = mat4(
            vec4(1.0, 0.0, 0.0, 0.0), 
            vec4(0.0, 1.0, 0.0, 0.33), 
            vec4(0.0, 0.0, 1.0, 0.66), 
            vec4(1.0, 1.0, 0.0, 1.0)
        );
        
        vec2 u_gradientStart = vec2(0.0, 0.0);
        vec2 u_gradientEnd = vec2(1024.0, 768.0);

        // gradient
        vec3 gradientColor1     = u_gradientMat[0].xyz;
        float gradientAmount1   = u_gradientMat[0].w;

        vec3 gradientColor2     = u_gradientMat[1].xyz;
        float gradientAmount2   = u_gradientMat[1].w;

        vec3 gradientColor3     = u_gradientMat[2].xyz;
        float gradientAmount3   = u_gradientMat[2].w;

        vec3 gradientColor4     = u_gradientMat[3].xyz;
        float gradientAmount4   = u_gradientMat[3].w;

        vec2 gradientStart      = u_gradientStart.xy;
        vec2 gradientEnd        = u_gradientEnd.xy;
        
        vec2 gradientDir        = gradientEnd - gradientStart; // 逻辑控制 两者不相等
        vec2 gradientDirNor     = normalize(gradientDir);
        float gradientLength    = length(gradientDir);

        vec2 gradientV          = local - gradientStart;
        float gradient          = dot(gradientV, gradientDirNor) / gradientLength;

        vec3 gradientColor      = gradientColor1 * step(gradient, gradientAmount1)
                                + mix(gradientColor1, gradientColor2, (gradient - gradientAmount1) / (gradientAmount2 - gradientAmount1)) * (step(gradientAmount1, gradient) * step(gradient, gradientAmount2) )
                                + mix(gradientColor2, gradientColor3, (gradient - gradientAmount2) / (gradientAmount3 - gradientAmount2)) * (step(gradientAmount2, gradient) * step(gradient, gradientAmount3) )
                                + mix(gradientColor3, gradientColor4, (gradient - gradientAmount3) / (gradientAmount4 - gradientAmount3)) * (step(gradientAmount3, gradient) * step(gradient, gradientAmount4) )
                                + gradientColor4 * step(gradientAmount4, gradient);

        return gradientColor;
    }

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
        
        vec3 color = computeGradientColor(vVertexPosition);
        gl_FragColor = vec4(color, a * uColor.a);
    }
    `);