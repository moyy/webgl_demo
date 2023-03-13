ProgramManager.getInstance().addShader("sdf_fast_border.fs", `

    #extension GL_OES_standard_derivatives : enable

    precision highp float;

    varying vec2 vVertexPosition;

    // 颜色
    uniform vec4 uColor;

    // 模糊半径，值越大，模糊范围越大
    // 正常形状：0.5
    // 否则就是 阴影 半径
    uniform float uAARadius;

    // 注1：当四个拐角都是 圆 的 时候
    // 注2：圆半径不得超过 矩形 的 半宽半高
    // [
    //    布局-缩放比例: vec4 (布局中心.xy, 布局缩放.xy)
    //    布局-半宽高：  vec4 (布局半宽, 布局半高, 0, 0)
    //    边框-外框-半径： vec4 (上左, 上右, 下右, 下左)
    //    边框大小：     vec4 (边框大小, 0, 0, 0)
    // ]
    uniform mat4 clipSdf;
 
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
    
    // r 半径，上左，上右，下右，下左 上右下左 r.x，r.y，r.z，r.w
    float sdfFastRoundBox(vec2 p, vec2 extent, vec4 r)
    {
        // 判断p在哪个象限
        r.xy = (p.x > 0.0) ? r.yz : r.xw;
        r.x = (p.y > 0.0) ? r.y : r.x;

        // 求最短距离
        vec2 q = abs(p) - extent + r.x;
        return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r.x;
    }

    void main() {
        vec4 scale = clipSdf[0];
		vec2 pos = scale.zw * vVertexPosition - scale.xy;
	
        // 外 半径
        vec4 bigRadius = clipSdf[2];
        
        // 边框 半径
		vec4 param3 = clipSdf[3];
        float borderSize = param3.x;

        vec4 param1 = clipSdf[1];
		vec2 extent = param1.xy;

        pos = scale.zw * vVertexPosition - scale.xy;
        float d_big = sdfFastRoundBox(pos, extent, bigRadius);
        
        vec4 smallRadius = bigRadius - vec4(borderSize);
        extent -= vec2(borderSize);
        float d_small = sdfFastRoundBox(pos, extent, smallRadius);
        
        // 集合的差 对应的 sdf 公式
        float d = max(d_big, -d_small);
        
        float s = getScale(pos);
        float a = antialias(s, uAARadius, d);
        
        gl_FragColor = vec4(uColor.rgb, a * uColor.a);
    }
`);