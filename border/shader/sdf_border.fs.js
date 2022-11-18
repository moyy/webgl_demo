ProgramManager.getInstance().addShader("sdf_border.fs", `

    #extension GL_OES_standard_derivatives : require

    precision highp float;

    varying vec2 vVertexPosition;

    // 颜色
    uniform vec4 uColor;

    // [
    //    布局-缩放比例: vec4 (布局中心.xy, 布局缩放.xy)
    //    布局-半宽高：  vec4 (布局半宽, 布局半高, top, right)
    //    边框-上半部：  vec4 (左, 上，上，右)
    //    边框-下半部：  vec4 (右，下, 下，左)
    // ]
    uniform mat4 clipSdf;

    // 下-左
    uniform vec2 bottomLeftBorder;
 
    float sdfEllipse(vec2 xy, vec2 center, vec2 ab)
    {
        xy -= center;
        
        // 求 (1/a, 1/b)
        vec2 recAB = 1.0 / ab;

        // 求 (x/a, y/b) = (x, y) * (1/a, 1/b)
        vec2 scale = xy * recAB;
        
        // 椭圆值 f = (x/a)^2 + (y/b)^2 - 1
        return dot(scale, scale) - 1.0;
    }

    float sdfRect(vec2 xy, vec2 wh)
    {
        vec2 d = abs(xy) - wh;
        return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
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

    float cross_pt(vec2 v1, vec2 v2) {
        return -(v1.x * v2.y - v1.y * v2.x);
    }

    // p0, p1, p2 是否 逆时针
    bool is_ccw(vec2 p0, vec2 p1, vec2 p2) {
        vec2 v1 = p1 - p0;
        vec2 v2 = p2 - p0;
        float r = cross_pt(v1, v2);

        return r > 0.0;
    }

    bool is_left_top(vec2 pt, vec2 wh, vec2 center) {

        vec2 pt0 = vec2(-wh.x, center.y);
        vec2 pt1 = vec2(center.x, -wh.y);

        return is_ccw(pt, pt0, pt1);
    }

    bool is_top_right(vec2 pt, vec2 wh, vec2 center) {
        vec2 pt0 = vec2(center.x, -wh.y);
        vec2 pt1 = vec2(wh.x, center.y);

        return is_ccw(pt, pt0, pt1);
    }

    bool is_right_bottom(vec2 pt, vec2 wh, vec2 center) {
        vec2 pt0 = vec2(wh.x, center.y);
        vec2 pt1 = vec2(center.x, wh.y);

        return is_ccw(pt, pt0, pt1);
    }

    bool is_bottom_left(vec2 pt, vec2 wh, vec2 center) {
        vec2 pt0 = vec2(center.x, wh.y);
        vec2 pt1 = vec2(-wh.x, center.y);

        return is_ccw(pt, pt0, pt1);
    }

    float antialiase_round_rect(vec2 pt, vec2 extent, vec2 offset1, vec2 offset2, vec2 offset3, vec2 offset4) {
        
        float d_rect = sdfRect(pt, extent);
        float a_rect = antialiase(d_rect);

        vec2 center = vec2(-extent.x + offset1.x, -extent.y + offset1.y); 
        
        // mix(begin, end, f)

        if (is_left_top(pt, extent, center)) {
            float d = sdfEllipse(pt, center, abs(offset1));
            float a = antialiase(d);
            return min(a_rect, a);
        }

        center = vec2(extent.x + offset2.x, -extent.y + offset2.y); 
        if (is_top_right(pt, extent, center)) {
            float d = sdfEllipse(pt, center, abs(offset2));
            float a = antialiase(d);
            return min(a_rect, a);
        }

        center = vec2(extent.x + offset3.x, extent.y + offset3.y); 
        if (is_right_bottom(pt, extent, center)) {
            float d = sdfEllipse(pt, center, abs(offset3));
            float a = antialiase(d);
            return min(a_rect, a);
        }
        
        center = vec2(-extent.x + offset4.x, extent.y + offset4.y); 
        if (is_bottom_left(pt, extent, center)) {
            float d = sdfEllipse(pt, center, abs(offset4));
            float a = antialiase(d);
            return min(a_rect, a);
        }

        return a_rect;
    }

    void main() {
        vec4 scale = clipSdf[0];
		vec2 pos = scale.zw * vVertexPosition - scale.xy;
	
        vec4 top = clipSdf[2];
		vec4 bottom = clipSdf[3];

        vec4 param1 = clipSdf[1];
		vec2 extent = param1.xy;

        // ============ 外 圆角矩形

		vec2 lt_big = vec2(max(0.01, top.y), max(0.01, top.x));
		vec2 rt_big = vec2(-max(0.01, top.z), max(0.01, top.w));
		vec2 rb_big = vec2(-max(0.01, bottom.y), -max(0.01, bottom.x));
		vec2 lb_big = vec2(max(0.01, bottom.z), -max(0.01, bottom.w));
        
        float a_big = antialiase_round_rect(pos, extent, lt_big, rt_big, rb_big, lb_big);

        // ============ 内 圆角矩形

        // 上-右-下-左
		float t = param1.z;
        float r = param1.w;
        float b = bottomLeftBorder.x;
        float l = bottomLeftBorder.y;

        pos -= 0.5 * vec2(l - r, t - b);
        extent -= 0.5 * vec2(l + r, t + b);

        vec2 lt_small = vec2(max(0.01, top.y - l), max(0.01, top.x - t));
        vec2 rt_small = vec2(-max(0.01, top.z - r), max(0.01, top.w - t));
        vec2 rb_small = vec2(-max(0.01, bottom.y - r), -max(0.01, bottom.x - b));
        vec2 lb_small = vec2(max(0.01, bottom.z - l), -max(0.01, bottom.w - b));

        float a_small = antialiase_round_rect(pos, extent, lt_small, rt_small, rb_small, lb_small);

        // ============= 边框 = 外 - 内
        float a = a_big - a_small;

        gl_FragColor = vec4(uColor.rgb, a * uColor.a);
    }
`);