class SdfRect {
    static create(gl, w, h) {

        w /= 2;
        h /= 2;
        
        let aVertexPosition = [
            ...[-w, -h],
            ...[-w, h],
            ...[w, h],
            ...[w, -h],
        ];

        let indices = [0, 1, 2, 0, 2, 3];
        
        let e = new SdfRect(gl);
        
        let program = ProgramManager.getInstance().getProgram("sdf.vs", "sdf_rect.fs");

        let material = SdfRectMaterial.create(gl, program);
        material.setExtent(w, h);
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

class SdfRectMaterial {
    static create(gl, program) {
        return new SdfRectMaterial(gl, program);
    }

    constructor(gl, program) {
        this.gl = gl;
        this.program = program;

        this.uColor = [0.0, 0.0, 1.0, 1.0];

        // 矩形 宽，高
        this.uRect = [1.0, 1.0];
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

    setExtent(half_w, half_h) {
        this.uExtent = [half_w, half_h];
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

        let uExtent = program.getUniform("uExtent");
        gl.uniform2f(uExtent, ...this.uExtent);

        // 因为 四边形的坐标用的是 [-0.5, 0.5]，需要扩大 那么多倍 去匹配
        let uVertexScale = program.getUniform("uVertexScale");
        gl.uniform4f(uVertexScale, ...this.uVertexScale);
    }
}