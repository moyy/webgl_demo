ProgramManager.getInstance().addShader("sdf_ellipse.fs", `

    #extension GL_OES_standard_derivatives : enable

    precision highp float;

    // 颜色
    uniform vec4 uColor;

    // 椭圆 a, b
    uniform vec2 uEllipseAB;
    
    // 模糊半径，值越大，模糊范围越大
    // 正常形状：0.5
    // 否则就是 阴影 半径
    uniform float uAARadius;

    varying vec2 vVertexPosition;

    // 椭圆 sdf 的 精确计算 和 近似模拟 https://iquilezles.org/articles/ellipsedist/
    // 上篇文章的 shader 实现 https://www.shadertoy.com/view/4lsXDN
    // 椭圆 sdf 的 另一种 估算法 https://blog.chatfield.io/simple-method-for-distance-to-ellipse/
    // 上篇文章的 去三角函数 的 版本 https://github.com/0xfaded/ellipse_demo/issues/1
    // 上篇文章的 shader 实现 https://www.shadertoy.com/view/tttfzr
    // 点到 椭圆 距离 的 数学推导 和 估算框架 https://www.geometrictools.com/Documentation/DistancePointEllipseEllipsoid.pdf
    
    // https://www.shadertoy.com/view/tttfzr
    float sdfEllipse(vec2 p, vec2 center, vec2 ab)
    {
        p -= center;

        // symmetry
        p = abs(p);
        
        // initial value
        vec2 q = ab * (p - ab);
        vec2 cs = normalize((q.x < q.y) ? vec2(0.01, 1) : vec2(1, 0.01) );

        // find root with Newton solver
        for(int i = 0; i < 5; i++) {
            vec2 u = ab * vec2(cs.x,cs.y);
            vec2 v = ab * vec2(-cs.y,cs.x);
            
            float a = dot(p-u, v);
            float c = dot(p-u, u) + dot(v, v);
            float b = sqrt(c * c - a * a);
            
            cs = vec2( cs.x * b - cs.y * a, cs.y * b + cs.x * a ) / c;
        }
        
        // compute final point and distance
        float d = length(p - ab * cs);
        
        // return signed distance
        return (dot(p/ab, p/ab) > 1.0) ? d : -d;
    }
    
    // https://iquilezles.org/articles/ellipsoids/
    float sdfEllipseSimple(vec2 p, vec2 center, vec2 ab)
    {
        p -= center;

        float k1 = length(p / ab);
        float k2 = length(p/(ab * ab));
        return (k1 - 1.0) * k1 / k2;
    }

    // fs 中 计算 缩放系数
    float getScale(vec2 position) {
        // position 变化率，放大2倍，w=0.5
        vec2 w = fwidth(position);
        
        // sqrt(2) / length(w) = inversesqrt(0.5 * dot(w, w))
        return inversesqrt(0.5 * dot(w, w));
    }


    // d 和 radius 都是 设计空间中的参数
    float antialias(float scale, float radius, float d) {
        
        d *= scale;
        radius *= scale;

        // 当 radius = 0.5 时候，抗锯齿 1像素 
        // d 在 [-radius, radius] 返回 [0.0, 1.0]

        float r = 0.5 * (1.0 - d / radius);

        return clamp(r, 0.0, 1.0);
    }
    
    uniform vec4 uVertexScale;

    void main() {
        vec2 pos = uVertexScale.zw * vVertexPosition;
        float d = sdfEllipseSimple(pos, uVertexScale.xy, uEllipseAB);
        
        float scale = getScale(pos);
        float a = antialias(scale, uAARadius, d);
        
        gl_FragColor = vec4(uColor.rgb, a * uColor.a);
    }
    `);