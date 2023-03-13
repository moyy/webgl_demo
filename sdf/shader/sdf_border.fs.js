ProgramManager.getInstance().addShader("sdf_border.fs", `

    #extension GL_OES_standard_derivatives : enable

    precision highp float;

    varying vec2 vVertexPosition;

    // 颜色
    uniform vec4 uColor;

    // 模糊半径，值越大，模糊范围越大
    // 正常形状：0.5
    // 否则就是 阴影 半径
    uniform float uAARadius;

    // [
    //    布局-缩放比例: vec4 (布局中心.xy, 布局缩放.xy)
    //    布局-半宽高：  vec4 (布局半宽, 布局半高, top, right)
    //    边框-上半部：  vec4 (左, 上，上，右)
    //    边框-下半部：  vec4 (右，下, 下，左)
    // ]
    uniform mat4 clipSdf;

    // 下-左
    uniform vec2 bottomLeftBorder;

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
 
    float sdfRect(vec2 xy, vec2 wh)
    {
        vec2 d = abs(xy) - wh;
        return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
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

    float crossPt(vec2 v1, vec2 v2) {
        return -(v1.x * v2.y - v1.y * v2.x);
    }

    // p0, p1, p2 是否 逆时针
    bool isCcw(vec2 p0, vec2 p1, vec2 p2) {
        vec2 v1 = p1 - p0;
        vec2 v2 = p2 - p0;
        float r = crossPt(v1, v2);
        
        return r > 0.0;
    }

    bool isLeftTop(vec2 pt, vec2 wh, vec2 center) {

        vec2 pt0 = vec2(-wh.x, center.y);
        vec2 pt1 = vec2(center.x, -wh.y);

        return isCcw(pt, pt0, pt1);
    }

    bool isTopRight(vec2 pt, vec2 wh, vec2 center) {
        vec2 pt0 = vec2(center.x, -wh.y);
        vec2 pt1 = vec2(wh.x, center.y);

        return isCcw(pt, pt0, pt1);
    }

    bool isRightBottom(vec2 pt, vec2 wh, vec2 center) {
        vec2 pt0 = vec2(wh.x, center.y);
        vec2 pt1 = vec2(center.x, wh.y);

        return isCcw(pt, pt0, pt1);
    }

    bool isBottomLeft(vec2 pt, vec2 wh, vec2 center) {
        vec2 pt0 = vec2(center.x, wh.y);
        vec2 pt1 = vec2(-wh.x, center.y);

        return isCcw(pt, pt0, pt1);
    }

    float sdfRoundRect(vec2 pt, vec2 extent, vec2 offset1, vec2 offset2, vec2 offset3, vec2 offset4) {
        float d_rect = sdfRect(pt, extent);
        
        vec2 center = vec2(-extent.x + offset1.x, -extent.y + offset1.y); 
        if (isLeftTop(pt, extent, center)) {
            float d_lt = sdfEllipseSimple(pt, center, abs(offset1));
            return max(d_rect, d_lt);
        }
        
        center = vec2(extent.x + offset2.x, -extent.y + offset2.y); 
        if (isTopRight(pt, extent, center)) {
            float d_tr = sdfEllipseSimple(pt, center, abs(offset2));
            return max(d_rect, d_tr);
        }
        
        center = vec2(extent.x + offset3.x, extent.y + offset3.y); 
        if (isRightBottom(pt, extent, center)) {
            float d_rb = sdfEllipseSimple(pt, center, abs(offset3));
            return max(d_rect, d_rb);
        }

        center = vec2(-extent.x + offset4.x, extent.y + offset4.y); 
        if (isBottomLeft(pt, extent, center)) {
            float d_bl = sdfEllipseSimple(pt, center, abs(offset4));
            return max(d_rect, d_bl);
        }

        return d_rect;
    }

    void main() {
        vec4 scale = clipSdf[0];
		vec2 pos = scale.zw * vVertexPosition - scale.xy;
	
        vec4 top = clipSdf[2];
		vec4 bottom = clipSdf[3];

        vec4 param1 = clipSdf[1];
		vec2 extent = param1.xy;

        // ============ 外 圆角矩形

		vec2 lt_big = vec2(max(0.001, top.y), max(0.001, top.x));
		vec2 rt_big = vec2(-max(0.001, top.z), max(0.001, top.w));
		vec2 rb_big = vec2(-max(0.001, bottom.y), -max(0.001, bottom.x));
		vec2 lb_big = vec2(max(0.001, bottom.z), -max(0.001, bottom.w));
        
        float d_big = sdfRoundRect(pos, extent, lt_big, rt_big, rb_big, lb_big);

        // ============ 内 圆角矩形

        // 上-右-下-左
		float t = param1.z;
        float r = param1.w;
        float b = bottomLeftBorder.x;
        float l = bottomLeftBorder.y;

        vec2 lt_small = vec2(max(0.001, top.y - l), max(0.001, top.x - t));
        vec2 rt_small = vec2(-max(0.001, top.z - r), max(0.001, top.w - t));
        vec2 rb_small = vec2(-max(0.001, bottom.y - r), -max(0.001, bottom.x - b));
        vec2 lb_small = vec2(max(0.001, bottom.z - l), -max(0.001, bottom.w - b));

        vec2 pos_small = pos - 0.5 * vec2(l - r, t - b);
        vec2 extent_small = extent - 0.5 * vec2(l + r, t + b);
        float d_small = sdfRoundRect(pos_small, extent_small, lt_small, rt_small, rb_small, lb_small);

        // ========== 外 - 内
        float d = max(d_big, -d_small);

        float s = getScale(pos);
        float a = antialias(s, uAARadius, d);

        gl_FragColor = vec4(uColor.rgb, a * uColor.a);
    }
`);