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

    // 可以看成 fs 中 计算 统一缩放系数 的 倒数
    float computeAARange(vec2 position) {
        // position 变化率，放大2倍，w 0.5
        vec2 w = fwidth(position);
        
        // sqrt(2)/length(w) = inversesqrt(0.5 * dot(w, w))
        return inversesqrt(0.5 * dot(w, w));
    }

    // The aa_range is already stored as a reciprocal with uniform scale
    // so just multiply it, then use that for AA.
    float distanceAA(float recip_scale, float signed_distance) {
        
        float d = recip_scale * signed_distance;
        
        // webrender 原始 公式，太严格，导致 抗锯齿 不大 成功？
        // d 在 [-0.5, 0.5] 之间，0.5 - d 在 [0, 1]
        // return clamp(0.5 - d, 0.0, 1.0);
        
        // d 在 [-1.0, 1.0] 之间，0.5 * (1.0 + d) 在 [0, 1]
        return clamp(0.5 * (1.0 - d), 0.0, 1.0);
    }

    void main() {
        vec2 pos = uVertexScale.zw * vVertexPosition - uVertexScale.xy;
        
        float d = sdfRect(pos, uExtent);

        float aaRange = computeAARange(pos);
        float a = distanceAA(aaRange, d);
        
        gl_FragColor = vec4(uColor.rgb, a * uColor.a);
    }
    `);