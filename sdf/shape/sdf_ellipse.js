class SdfEllipse {
    static create(gl, a, b) {
        let aVertexPosition = [
            ...[-a, -b],
            ...[-a, b],
            ...[a, b],
            ...[a, -b],
        ];

        let indices = [0, 1, 2, 0, 2, 3];
        
        let e = new SdfEllipse(gl);
        let program = ProgramManager.getInstance().getProgram("sdf.vs", "sdf_ellipse.fs");

        let material = SdfEllipseMaterial.create(gl, program);
        material.setEllipseAB(a, b);
        material.setVertexScale(0, 0, 1, 1);

        e.mesh = Mesh.create(gl);
        e.mesh.setMaterial(material);
        e.mesh.setIndices(indices);
        e.mesh.addAttribute("aVertexPosition", 2, aVertexPosition);

        return e;
    }

    constructor(gl) {
        this.gl = gl;
        this.mesh = null;
    }

    draw(camera) {
        this.mesh.draw(camera);
    }
}

class SdfEllipseMaterial {
    static create(gl, program) {
        return new SdfEllipseMaterial(gl, program);
    }

    constructor(gl, program) {
        this.gl = gl;
        this.program = program;

        this.uColor = [0.0, 0.0, 1.0, 1.0];

        // 椭圆 半长轴，半短轴
        this.uEllipseAB = [1.0, 1.0];
        // obj 放大到 矩阵 的 缩放系数 (x, y, w, h)
        this.uVertexScale = [0.0, 0.0, 1.0, 1.0];

        this.uWorld = mat4.create();
        mat4.identity(this.uWorld);
    }

    setWorldMatrix(m) {
        this.uWorld = m;
    }

    setColor(r, g, b, a) {
        this.uColor = [r, g, b, a];
    }

    setVertexScale(x, y, w, h) {
        this.uVertexScale = [x, y, w, h];
    }

    setEllipseAB(a, b) {
        this.uEllipseAB = [a, b];
    }

    use(camera) {
        let gl = this.gl;
        let program = this.program;

        gl.useProgram(this.program.id);

        let uWorld = program.getUniform("uWorld");
        gl.uniformMatrix4fv(uWorld, false, this.uWorld);

        let uView = program.getUniform("uView");
        gl.uniformMatrix4fv(uView, false, camera.uView);

        let uProj = program.getUniform("uProj");
        gl.uniformMatrix4fv(uProj, false, camera.uProj);

        let uColor = program.getUniform("uColor");
        gl.uniform4f(uColor, ...this.uColor);

        let uEllipseAB = program.getUniform("uEllipseAB");
        gl.uniform2f(uEllipseAB, ...this.uEllipseAB);

        // 因为 四边形的坐标用的是 [-0.5, 0.5]，需要扩大 那么多倍 去匹配
        let uVertexScale = program.getUniform("uVertexScale");
        gl.uniform4f(uVertexScale, ...this.uVertexScale);
    }
}