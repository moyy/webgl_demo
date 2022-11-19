ProgramManager.getInstance().addShader("sdf_pie.fs", `

    #extension GL_OES_standard_derivatives : require

    precision highp float;

    varying vec2 vVertexPosition;

    // 颜色
    uniform vec4 uColor;

    // 扇形 SDF 信息
    // [
    //    vec3 (布局中心.x, 布局中心.y, 布局缩放.x)
    //    vec3 (布局缩放.y, sin(对称轴-y轴), cos(对称轴-y轴))
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
        
        float a = antialiase(d);
        gl_FragColor = vec4(uColor.rgb, a * uColor.a);
    }
`);