ProgramManager.getInstance().addShader("sdf_arc.fs", `

    #extension GL_OES_standard_derivatives : enable

    precision highp float;

    varying vec2 vVertexPosition;

    // 颜色
    uniform vec4 uColor;

    // 模糊半径，值越大，模糊范围越大
    // 正常形状：0.5
    // 否则就是 阴影 半径
    uniform float uAARadius;
    
    // 圆弧 SDF 信息
    // [
    //    vec4 (布局中心.x, 布局中心.y, 布局缩放.x, 布局缩放.y),
    //    vec4 (sin(对称轴-x轴), cos(对称轴-x轴), sin(边缘-对称轴), cos(边缘-对称轴)),
    //    vec4 (r-半径, w-圆弧宽度的一半, isFlat-1表示平角圆弧, 0),
    //    vec4 (0, 0, 0, 0),
    // ]
    uniform mat4 uArcSdf;

    // 圆弧 sdf，负数在里面，正数在外面
    // pt 待求点
    // sc 圆弧 边缘处 距离 y轴的 夹角 sin, cos
    // r 半径
    // w 圆弧 宽度 的 一半
    float sdfArc(vec2 pt, vec2 sc, float r, float w)
    {
        pt.x = abs(pt.x);
        float k = (sc.y * pt.x > sc.x * pt.y) ? dot(pt, sc) : length(pt);
        // 余弦定理
        float d = sqrt(dot(pt, pt) + r * r - 2.0 * r * k);

        return d - w;
    }

    // 边缘为 平角 的 圆弧
    float sdfArcFlat(vec2 pt, vec2 sc, float r, float w)
    {
        pt.x = abs(pt.x);
        
        // 逆时针 旋转 Alpha
        pt *= mat2(sc.y, -sc.x, sc.x, sc.y);

        float len = length(pt);
        
        pt = vec2((pt.x > 0.0 || pt.y>0.0) ? pt.x : (-len), (pt.x < 0.0) ? len : pt.y);    
        
        pt = vec2(pt.x, abs(pt.y - r)) - vec2(0.0, w);
        
        return length(max(pt, 0.0)) + min(max(pt.x,pt.y), 0.0);
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
        
        // 逆过来乘，将 扇形 乘回 到 对称轴 为 y轴 处
        // 调整到 PI / 2 = 1.570796325
        // cos(a- pi/2) = sin(a), sin(a - pi/2) = -cos(a)
        // 要乘以 旋转矩阵 的 逆
        pos = vec2(axisSC.x * pos.x - axisSC.y * pos.y, axisSC.y * pos.x + axisSC.x * pos.y);
        
        float d = 0.0;
        if (isFlat < 0.1) {
            d = sdfArc(pos, sc, r, w);
        } else {
            d = sdfArcFlat(pos, sc, r, w);
        }

        float s = getScale(pos);
        float a = antialias(s, uAARadius, d);

        gl_FragColor = vec4(uColor.rgb, a * uColor.a);
    }
`);