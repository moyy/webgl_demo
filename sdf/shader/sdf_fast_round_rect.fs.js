ProgramManager.getInstance().addShader("sdf_fast_round_rect.fs", `

    #extension GL_OES_standard_derivatives : require

    precision highp float;

    varying vec2 vVertexPosition;

    // 颜色
    uniform vec4 uColor;
    
    // 当四个拐角都是 圆 的 时候
    // 注：圆半径不得超过 矩形 的 半宽半高
    // [
    //    布局-缩放比例: vec4 (布局中心.xy, 布局缩放.xy)
    //    布局-半宽高：  vec4 (布局半宽, 布局半高, 0, 0)
    //    边框-半径：    vec4 (上左, 上右, 下右, 下左)
    //    没用到：       vec4 (0, 0, 0, 0)
    // ]
    uniform mat4 uBorderSdf;
 
    float sdfRect(vec2 p, vec2 extent)
    {
        vec2 d = abs(p) - extent;
        return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
    }

    // r 半径，上左，上右，下右，下左 r.x，r.y，r.z，r.w
    float sdfFastRoundBox(vec2 p, vec2 extent, vec4 r)
    {
        // 判断p在哪个象限
        r.xy = (p.x > 0.0) ? r.yz : r.xw;

        r.x = (p.y > 0.0) ? r.y : r.x;

        // 求最短距离
        return sdfRect(p, extent - r.x) - r.x;
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
        vec4 scale = uBorderSdf[0];
        vec2 pos = scale.zw * vVertexPosition - scale.xy;

        vec4 radius = uBorderSdf[2];

        vec4 info = uBorderSdf[1];
        vec2 extent = info.xy;

        float d = sdfFastRoundBox(pos, extent, radius);
        
        float aaRange = computeAARange(pos);
        float a = distanceAA(aaRange, d);
        
        gl_FragColor = vec4(uColor.rgb, a * uColor.a);
    }
`);