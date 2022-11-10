ProgramManager.getInstance().addShader("sdf_round_rect.fs", `

    #extension GL_OES_standard_derivatives : require

    precision highp float;

    varying vec2 vVertexPosition;

    // 颜色
    uniform vec4 uColor;

    // [
    //    布局-缩放比例: vec4 (布局中心.xy, 布局缩放.xy)
    //    布局-半宽高：  vec4 (布局半宽, 布局半高, 0, 0)
    //    边框-上半部：  vec4 (左, 上，上，右)
    //    边框-下半部：  vec4 (右，下, 下，左)
    // ]
    uniform mat4 uBorderSdf;
 
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
        vec4 scale = uBorderSdf[0];
        vec2 pos = scale.zw * (vVertexPosition) - scale.xy;

        vec4 top = uBorderSdf[2];
        vec4 bottom = uBorderSdf[3];

        // 左上角
        vec2 c1 = vec2(max(0.01, top.y), max(0.01, top.x));
        // 右上角
        vec2 c2 = vec2(-max(0.01, top.z), max(0.01, top.w));
        // 右下角
        vec2 c3 = vec2(-max(0.01, bottom.y), -max(0.01, bottom.x));
        // 左下角
        vec2 c4 = vec2(max(0.01, bottom.z), -max(0.01, bottom.w));
        
        vec2 extent = uBorderSdf[1].xy;
        float a = antialiase_round_rect(pos, extent, c1, c2, c3, c4);
        
        gl_FragColor = vec4(uColor.rgb, a * uColor.a);        
    }
`);