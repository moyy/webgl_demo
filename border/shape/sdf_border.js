/**
 * 边框
 */
class SdfBorder {

    // TODO 这里 暂时 不处理 半径超过 宽高的情况
    // borders = [左, 上, 上, 右, 右, 下, 下, 左];
    // innerBorders = [上, 右，下，左];
    static create(gl, w, h, borders, innerBorders) {
        let e = new SdfBorder(gl);

        w /= 2;
        h /= 2;

        let aVertexPosition = [
            ...[0, 0],
            ...[0, 1],
            ...[1, 1],
            ...[1, 0],
        ];

        let indices = [
            0, 1, 2,
            0, 2, 3,
        ];

        let program = ProgramManager.getInstance().getProgram("sdf.vs", "sdf_border.fs");

        let material = SdfBorderMaterial.create(gl, program);
        material.setInfo(
            w, h,
            w, h, 2 * w, 2 * h,
            borders,
            innerBorders,
        );
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

class SdfBorderMaterial {
    static create(gl, program) {
        return new SdfBorderMaterial(gl, program);
    }

    constructor(gl, program) {
        this.gl = gl;
        this.program = program;

        this.uColor = [0.0, 0.0, 1.0, 1.0];

        this.uWorld = mat4.create();
        mat4.identity(this.uWorld);
    }

    setWorldMatrix(m) {
        this.uWorld = m;
    }

    setColor(r, g, b, a) {
        this.uColor = [r, g, b, a];
    }

    // [half_w, half_h],
    // [offset_x, offset_y],
    // [左, 上, 上, 右, 右, 下, 下, 左]
    // [上, 右, 下, 左]
    setInfo(
        half_w, half_h,
        offset_x, offset_y,
        scale_x, scale_y,
        borders,
        innerBorders
    ) {
        this.bottomLeftBorder = [innerBorders[2], innerBorders[3]];

        this.clipSdf = new Float32Array([
            offset_x, offset_y, scale_x, scale_y,
            half_w, half_h, innerBorders[0], innerBorders[1],
            ...borders,
        ]);
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

        let bottomLeftBorder = program.getUniform("bottomLeftBorder");
        gl.uniform2f(bottomLeftBorder, ...this.bottomLeftBorder);

        let clipSdf = program.getUniform("clipSdf");
        gl.uniformMatrix4fv(clipSdf, false, this.clipSdf);
    }
}