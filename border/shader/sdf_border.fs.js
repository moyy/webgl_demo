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

    // 边框
    float antialiaseBorderRect(vec2 pt, vec2 extent, vec4 trbl) {
        float r_big = sdfRect(pt, extent);
        float a_big = antialiase(r_big);

        vec2 center = 0.5 * vec2(trbl.w - trbl.y, trbl.x - trbl.z); 
        extent = extent - 0.5 * vec2(trbl.y + trbl.w, trbl.x + trbl.z);
        float r_small = sdfRect(pt - center, extent);
        float a_small = antialiase(r_small);
        
        return a_big - a_small;
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

    float antialiase_between(float small_d, float big_d) 
    {
        float anti_big_d = 1.0 * fwidth(big_d);
        float a_big = 1.0 - smoothstep(-anti_big_d, anti_big_d, big_d);
        float anti_small_d = 1.0 * fwidth(small_d);
        float a_small = 1.0 - smoothstep(-anti_small_d, anti_small_d, small_d);
        return a_big - a_small;
    }

    float antialiase_border(vec2 pt, vec2 extent, vec2 offset1, vec2 offset2, vec2 offset3, vec2 offset4, vec4 trbl) {
		vec2 center = vec2(-extent.x + offset1.x, -extent.y + offset1.y); 
        vec2 r = pt - center;
        if (r.x < 0.0 && r.y < 0.0) {
			vec2 big = abs(offset1);
			
			vec2 small = big - trbl.wx;
			float small_d = sdfEllipse(pt, center, small);
			
			float big_d = sdfEllipse(pt, center, big);
			return antialiase_between(small_d, big_d);
		}

		center = vec2(extent.x + offset2.x, -extent.y + offset2.y); 
		r = pt - center;
        if (r.x > 0.0 && r.y < 0.0) {
			vec2 big = abs(offset2);
			vec2 small = big - trbl.yx;

			float small_d = sdfEllipse(pt, center, small);
			
			float big_d = sdfEllipse(pt, center, big);
			return antialiase_between(small_d, big_d);
		}

		center = vec2(extent.x + offset3.x, extent.y + offset3.y); 
		r = pt - center;
        if (r.x > 0.0 && r.y > 0.0) {
			vec2 big = abs(offset3);
			
			vec2 small = big - trbl.yz;
			float small_d = sdfEllipse(pt, center, small);
			
			float big_d = sdfEllipse(pt, center, big);
			return antialiase_between(small_d, big_d);
		}
		
		center = vec2(-extent.x + offset4.x, extent.y + offset4.y); 
		r = pt - center;
        if (r.x < 0.0 && r.y > 0.0) {
			vec2 big = abs(offset4);
			
			vec2 small = big - trbl.wz;
			float small_d = sdfEllipse(pt, center, small);
			
			float big_d = sdfEllipse(pt, center, big);
			return antialiase_between(small_d, big_d);
		}

		return antialiaseBorderRect(pt, extent, trbl);
	}

    void main() {
        vec4 scale = clipSdf[0];
		vec2 pos = scale.zw * vVertexPosition - scale.xy;
	
        vec4 top = clipSdf[2];
		vec4 bottom = clipSdf[3];

		// 左上角
		vec2 c1 = vec2(max(0.01, top.y), max(0.01, top.x));
		// 右上角
		vec2 c2 = vec2(-max(0.01, top.z), max(0.01, top.w));
		// 右下角
		vec2 c3 = vec2(-max(0.01, bottom.y), -max(0.01, bottom.x));
		// 左下角
		vec2 c4 = vec2(max(0.01, bottom.z), -max(0.01, bottom.w));
		
		vec4 param1 = clipSdf[1];
		vec2 extent = param1.xy;
		// 上-右-下-左
		vec4 trbl = vec4(param1.zw, bottomLeftBorder);

		float a = antialiase_border(pos, extent, c1, c2, c3, c4, trbl);
        
        gl_FragColor = vec4(uColor.rgb, a * uColor.a);        
    }
`);