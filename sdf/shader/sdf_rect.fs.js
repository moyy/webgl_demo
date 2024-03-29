ProgramManager.getInstance().addShader("sdf_rect.fs", `

    #extension GL_OES_standard_derivatives : enable

    precision highp float;

    // 颜色
    uniform vec4 uColor;

    // 矩形 半宽，半高
    uniform vec2 uExtent;

    // 模糊半径，值越大，模糊范围越大
    // 正常形状：0.5
    // 否则就是 阴影 半径
    uniform float uAARadius;
    
    // uVertexScale.xy 椭圆 中心，在 物体空间 的 位置；
    //    例1: aVertexPosition 范围是 [-0.5, 0.5] 变成 200*100 矩形 时，缩放系数 是 vec2(200, 100)
    //    例2: aVertexPosition 范围是 [0, 100] * [0, 200] 变成 100*200 矩形 时，缩放系数 是 vec2(1, 3)
    // 
    // uVertexScale.zw 物体缩放系数
    //    例1: aVertexPosition 范围是 [-0.5, 0.5] 变成 200*100 矩形 时，缩放系数 是 vec2(200, 100)
    //    例2: aVertexPosition 范围是 [0, 100] * [0, 200] 变成 100*200 矩形 时，缩放系数 是 vec2(1, 3)
    uniform vec4 uVertexScale;

    varying vec2 vVertexPosition;

    // 返回 coord 到 矩形 最短距离, 负值表示 在里面, 正值表示在外面
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

    void main() {
        vec2 pos = uVertexScale.zw * vVertexPosition - uVertexScale.xy;
        
        float d = sdfRect(pos, uExtent);

        float scale = getScale(pos);
        float a = antialias(scale, uAARadius, d);
        
        gl_FragColor = vec4(uColor.rgb, a * uColor.a);
    }
    `);