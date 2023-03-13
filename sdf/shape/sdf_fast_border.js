/**
 * 边框
 */
class SdfFastBorder {

    // TODO 这里 暂时 不处理 半径超过 宽高的情况
    // radius = [左上, 上右, 右下, 下左];
    // borderSize = 边框大小
    static create(gl, w, h, radius, borderSize) {
        let e = new SdfFastBorder(gl);

        w /= 2;
        h /= 2;
        let aVertexPosition = [
            ...[-w, -h],
            ...[-w, h],
            ...[w, h],
            ...[w, -h],
        ];

        let indices = [0, 1, 2, 0, 2, 3];

        let program = ProgramManager.getInstance().getProgram("sdf.vs", "sdf_fast_border.fs");

        let material = SdfFastBorderMaterial.create(gl, program);
        material.setInfo(
            w, h,
            0, 0, 1, 1,
            radius, borderSize,
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

class SdfFastBorderMaterial {
    static create(gl, program) {
        return new SdfFastBorderMaterial(gl, program);
    }

    constructor(gl, program) {
        this.gl = gl;
        this.program = program;

        this.uColor = [0.0, 0.0, 1.0, 1.0];

        // AA半径，对正常物体是 0.5，对 阴影是 阴影半径
        this.uAARadius = 0.5;

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
    // 上左, 上右, 下右, 下左
    // 边框大小
    setInfo(
        half_w, half_h,
        offset_x, offset_y,
        scale_x, scale_y,
        radius,
        borderSize
    ) {
        this.clipSdf = new Float32Array([
            offset_x, offset_y, scale_x, scale_y,
            half_w, half_h, 0, 0,
            ...radius,
            borderSize, 0, 0, 0,
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

        let clipSdf = program.getUniform("clipSdf");
        gl.uniformMatrix4fv(clipSdf, false, this.clipSdf);

        let uAARadius = program.getUniform("uAARadius");
        gl.uniform1f(uAARadius, this.uAARadius);
    }
}