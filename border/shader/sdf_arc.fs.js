ProgramManager.getInstance().addShader("sdf_arc.fs", `

    #extension GL_OES_standard_derivatives : require

    precision highp float;

    varying vec2 vVertexPosition;

    // 颜色
    uniform vec4 uColor;

    // 圆弧 SDF 信息
    // [
    //    vec4 (布局中心.x, 布局中心.y, 布局缩放.x, 布局缩放.y),
    //    vec4 (sin(对称轴-y轴), cos(对称轴-y轴), sin(边缘-对称轴), cos(边缘-对称轴)),
    //    vec4 (r-半径, w-圆弧宽度的一半, isFlat-1表示平角圆弧, 0),
    //    vec4 (0, 0, 0, 0),
    // ]
    uniform mat4 uArcSdf;

    // 圆弧 sdf，负数在里面，正数在外面
    // pt 待求点
    // sc 圆弧 边缘处 距离 y轴的 夹角 sin, cos
    // r 半径
    float sdfArc(vec2 pt, vec2 sc, float r)
    {
        pt.x = abs(pt.x);
        float k = (sc.y * pt.x > sc.x * pt.y) ? dot(pt, sc) : length(pt);
        // 余弦定理
        return sqrt(dot(pt, pt) + r * r - 2.0 * r * k);
    }

    // 有宽度 的 圆弧 sdf
    // w 圆弧 宽度 的 一半
    float sdfArcWidth(vec2 pt, vec2 sc, float r, float w)
    {
        float d = sdfArc(pt, sc, r);
        return d - w;
    }

    // 边缘为 平角 的 圆弧
    float sdfArcFlatWidth(vec2 pt, vec2 sc, float r, float w)
    {
        pt.x = abs(pt.x);
        
        // 逆时针 旋转 Alpha
        pt *= mat2(sc.y, -sc.x, sc.x, sc.y);

        float len = length(pt);
        
        pt = vec2((pt.x > 0.0 || pt.y>0.0) ? pt.x : (-len), (pt.x < 0.0) ? len : pt.y);    
        
        pt = vec2(pt.x, abs(pt.y - r)) - vec2(0.0, w);
        
        return length(max(pt, 0.0)) + min(max(pt.x,pt.y), 0.0);
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
        vec4 scale = uArcSdf[0];
        
        vec4 arc2 = uArcSdf[1];
        vec2 axisSC = arc2.xy;
        vec2 sc = arc2.zw;
        
        vec4 arc3 = uArcSdf[2];
        float r = arc3.x;
        float w = arc3.y;
        float isFlat = arc3.z;

        vec2 pos = scale.zw * vVertexPosition - scale.xy;
        
        axisSC = vec2(sin(0.0), cos(0.0));
        // axisSC = vec2(sin(3.14159 / 6.0), cos(3.14159 / 6.0));
        sc = vec2(sin(3.14159 / 6.0), cos(3.14159 / 6.0));

        // 逆过来乘，将 扇形 乘回 到 对称轴 为 y轴 处
        pos = vec2(axisSC.y * pos.x - axisSC.x * pos.y, axisSC.x * pos.x + axisSC.y * pos.y);
        
        float d = 0.0;
        if (w < 1.0) {
            d = sdfArc(pos, sc, r);
        } else if (isFlat < 0.1) {
            d = sdfArcWidth(pos, sc, r, w);
        } else {
            d = sdfArcFlatWidth(pos, sc, r, w);
        }
        
        float a = antialiase(d);
        gl_FragColor = vec4(uColor.rgb, a * uColor.a);
    }
`);