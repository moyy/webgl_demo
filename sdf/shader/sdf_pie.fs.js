ProgramManager.getInstance().addShader("sdf_pie.fs", `

    #extension GL_OES_standard_derivatives : enable

    precision highp float;

    varying vec2 vVertexPosition;

    // 颜色
    uniform vec4 uColor;

    // 模糊半径，值越大，模糊范围越大
    // 正常形状：0.5
    // 否则就是 阴影 半径
    uniform float uAARadius;

    // 扇形 SDF 信息
    // [
    //    vec3 (布局中心.x, 布局中心.y, 布局缩放.x)
    //    vec3 (布局缩放.y, sin(对称轴-x轴), cos(对称轴-x轴))
    //    vec3 (sin(边缘-对称轴), cos(边缘-对称轴), r)
    // ]
    uniform mat3 uPieSdf;
 
    // 扇形 sdf，负数在里面，正数在外面
    // pt 待求点
    // sc 扇形 边缘处 距离 y轴的 夹角 sin, cos
    // r 半径
    // 参考 https://zhuanlan.zhihu.com/p/427587359
    float sdfPie(vec2 p, vec2 sc, float r)
    {
        p.x = abs(p.x);

        float d_circle = length(p) - r;
        
        // pie 为 0 或者 180 需要额外处理
        if (sc.x < 0.0001) {
            return abs(sc.y + 1.0) < 0.0001 ? d_circle : sc.y;
        }

        float d_border = length(p - sc * clamp(dot(p, sc), 0.0, r)) * sign(sc.y * p.x - sc.x * p.y);
        return max(d_circle, d_border);
    }

    // fs 中 计算 缩放系数
    float getScale(vec2 position) {
        // position 变化率，放大2倍，w=0.5
        vec2 w = fwidth(position);
        
        // sqrt(2) / length(w) = inversesqrt(0.5 * dot(w, w))
        return inversesqrt(0.5 * dot(w, w));
    }
    
    float antialias(float scale, float radius, float d) {
        
        d *= scale;
        radius *= scale;

        // 抗锯齿 1像素 
        // d 在 [-radius, radius] 返回 [0.0, 1.0]

        float r = 0.5 * (1.0 - d / radius);

        return clamp(r, 0.0, 1.0);
    }

    void main() {
        vec3 pie1 = uPieSdf[0];
        vec3 pie2 = uPieSdf[1];
        vec3 pie3 = uPieSdf[2];
        
        vec4 scale = vec4(pie1, pie2.x);

        vec2 axisSC = pie2.yz;
        vec2 sc = pie3.xy;
        float r = pie3.z;
        
        vec2 pos = scale.zw * vVertexPosition - scale.xy;
        
        // 逆过来乘，将 扇形 乘回 到 对称轴 为 y轴 处
        // 调整到 PI / 2 = 1.570796325
        // cos(a- pi/2) = sin(a), sin(a - pi/2) = -cos(a)
        // 要乘以 旋转矩阵 的 逆
        pos = vec2(axisSC.x * pos.x - axisSC.y * pos.y, axisSC.y * pos.x + axisSC.x * pos.y);
        float d = sdfPie(pos, sc, r);
        
        float s = getScale(pos);
        float a = antialias(s, uAARadius, d);

        gl_FragColor = vec4(uColor.rgb, a * uColor.a);
    }
`);