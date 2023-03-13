// https://zhuanlan.zhihu.com/p/26217154

ProgramManager.getInstance().addShader("sdf_circle.fs", `

    #extension GL_OES_standard_derivatives : enable

    precision highp float;

    // 颜色
    uniform vec4 uColor;

    // 圆 半径
    uniform float uRadius;

    // 模糊半径，值越大，模糊范围越大
    // 正常形状：0.5
    // 否则就是 阴影 半径
    uniform float uAARadius;
    
    varying vec2 vVertexPosition;

    // 返回 coord 到 圆的 最短距离, 负值表示 在里面, 正值表示在外面
    
    float sdfCircle(vec2 xy, float r)
    {
        return length(xy) - r;
    }

    // fs 中 计算 缩放系数
    float getScale(vec2 position) {
        // position 变化率，放大2倍，w=0.5
        vec2 w = fwidth(position);
        
        // sqrt(2) / length(w) = inversesqrt(0.5 * dot(w, w))
        return inversesqrt(0.5 * dot(w, w));
    }

    float antialias(float scale, float radius, float d) {
        
        d *= scale;
        radius *= scale;

        // 抗锯齿 1像素 
        // d 在 [-radius, radius] 返回 [0.0, 1.0]

        float r = 0.5 * (1.0 - d / radius);

        return clamp(r, 0.0, 1.0);
    }

    uniform vec4 uVertexScale;
    
    void main() {
        vec2 pos = uVertexScale.zw * vVertexPosition - uVertexScale.xy;
        
        float d = sdfCircle(pos, uRadius);
        
        float scale = getScale(pos);
        float a = antialias(scale, uAARadius, d);

        gl_FragColor = vec4(uColor.rgb, a * uColor.a);
    }
    `);