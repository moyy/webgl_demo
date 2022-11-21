ProgramManager.getInstance().addShader("sdf_fast_round_rect.fs", `

    #extension GL_OES_standard_derivatives : require

    precision highp float;

    varying vec2 vVertexPosition;

    // 颜色
    uniform vec4 uColor;
    
    // 当四个拐角都是 圆 的 时候
    // [
    //    布局-缩放比例: vec4 (布局中心.xy, 布局缩放.xy)
    //    布局-半宽高：  vec4 (布局半宽, 布局半高, 0, 0)
    //    边框-半径：    vec4 (上左, 上右, 下右, 下左)
    //    没用到：       vec4 (0, 0, 0, 0)
    // ]
    uniform mat4 uBorderSdf;
 
    // r 半径，上左，上右，下右，下左 r.x，r.y，r.z，r.w
    float sdfFastRoundBox(vec2 p, vec2 extent, vec4 r)
    {
        // 判断p在哪个象限
        r.xy = (p.x > 0.0) ? r.yz : r.xw;

        r.x = (p.y > 0.0) ? r.y : r.x;

        // 求最短距离
        vec2 q = abs(p) - extent + r.x;
        return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r.x;
    }

    // 根据 d, 抗锯齿, 返回 alpha值
    float antialiase(float d) 
    {
        float anti = 1.0 * fwidth(d);
        
        // smoothstep(-a, a, d) 意思是 根据 d-值 将 [-a, a] 平滑到 [0, 1] 中
        // d < -a, 全内部, 得到0, 这时期望 alpha = 1.0
        // d > a, 全外部, 得到1, 这时期望 alpha = 0.0
        
        return 1.0 - smoothstep(-anti, anti, d);
    }

    void main() {
        vec4 scale = uBorderSdf[0];
        vec2 pos = scale.zw * vVertexPosition - scale.xy;

        vec4 radius = uBorderSdf[2];

        vec4 info = uBorderSdf[1];
        vec2 extent = info.xy;

        float d = sdfFastRoundBox(pos, extent, radius);
        float a = antialiase(d);
        
        gl_FragColor = vec4(uColor.rgb, a * uColor.a);
    }
`);