class SdfRect {
    // padding 填充，填充一定 像素，避免 边缘抗锯齿
    static create(gl, w, h, padding) {

        if (typeof padding !== typeof 0) {
            padding = 3;
        }

        let program = ProgramManager.getInstance().getProgram("sdf.vs", "sdf_rect.fs");
        let r = new SdfRect(gl, program);
        r.material.setExtent(w / 2, h / 2);
        r.material.setVertexScale(0, 0, w + padding, h + padding);

        r.vbo.id = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, r.vbo.id);
        let vertices = [
            -0.5, -0.5,
            0.5, -0.5,
            0.5, 0.5,
            -0.5, 0.5,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        r.vbo.itemSize = 2;
        r.vbo.numItems = 4;

        r.ibo.id = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, r.ibo.id);
        let cubeVertexIndices = [0, 1, 2, 0, 2, 3];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
        r.ibo.itemSize = 1;
        r.ibo.numItems = 6;

        return r;
    }

    constructor(gl, program) {
        this.gl = gl;

        this.material = new SdfRectMaterial(gl, program);

        this.vbo = {
            id: null,
            itemSize: null,
            numItems: null,
        };

        this.ibo = {
            id: null,
            itemSize: null,
            numItems: null,
        };
    }

    draw(camera) {
        let gl = this.gl;

        this.material.use(camera);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.id);
        let aVertexPosition = this.material.program.getAttribute("aVertexPosition");
        gl.vertexAttribPointer(
            aVertexPosition,
            this.vbo.itemSize,
            gl.FLOAT,
            false,
            0,
            0
        );

        gl.enableVertexAttribArray(aVertexPosition);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo.id);

        let count = 440;
        // console.warn("=========== dc = " + count);
        for (let i = 0; i < count; ++i) {
            gl.drawElements(gl.TRIANGLES, this.ibo.numItems, gl.UNSIGNED_SHORT, 0);
        }
    }
}

class SdfRectMaterial {
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