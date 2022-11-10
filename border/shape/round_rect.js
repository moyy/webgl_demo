/**
 * 圆角矩形
 */
class RoundRect {

    // TODO 这里 暂时 不处理 半径超过 宽高的情况
    // conners = [左, 上, 上, 右, 右, 下, 下, 左]
    // 处理方式，分成 4个椭圆 和 1个 凸-八边形
    static create(gl, w, h, conners) {
        let e = new RoundRect(gl);

        var lt, tp, rg, bt;

        w /= 2;
        h /= 2;

        // 左上角
        lt = conners[0];
        tp = conners[1];
        let p0 = [-w, -h + lt];
        let p1 = [-w + tp, -h];

        // 右上角
        tp = conners[2];
        rg = conners[3];
        let p2 = [w - tp, -h];
        let p3 = [w, -h + rg];

        // 右下角
        rg = conners[4];
        bt = conners[5];
        let p4 = [w, h - rg];
        let p5 = [w - bt, h];

        // 左下角
        bt = conners[6];
        lt = conners[7];
        let p6 = [-w + bt, h];
        let p7 = [-w, h - lt];

        let center = [0, 0];

        // ============== 中心的 正八边形

        let colorPosition = [
            ...p0, ...p1, ...p2, ...p3, ...p4, ...p5, ...p6, ...p7, ...center,
        ];

        let colorIndices = [
            8, 0, 1,
            8, 1, 2,
            8, 2, 3,
            8, 3, 4,
            8, 4, 5,
            8, 5, 6,
            8, 6, 7,
            8, 7, 0,
        ];

        let program = ProgramManager.getInstance().getProgram("color.vs", "color.fs");
        let colorMaterial = ColorMaterial.create(gl, program);
        e.colorMesh = Mesh.create(gl);
        e.colorMesh.setMaterial(colorMaterial);
        e.colorMesh.setIndices(colorIndices);
        e.colorMesh.addAttribute("aVertexPosition", 2, colorPosition);

        // ============== 四个角的椭圆
        program = ProgramManager.getInstance().getProgram("sdf.vs", "sdf_ellipse.fs");

        let a = conners[1];
        let b = conners[0];
        if (a > 0 && b > 0) {
            let m = SdfEllipseMaterial.create(gl, program);
            center = [-w + a, -h + b];
            m.setVertexScale(center[0], center[1], 1, 1);
            m.setEllipseAB(a, b);

            let mesh = Mesh.create(gl);
            mesh.setMaterial(m);
            mesh.setIndices([0, 1, 2]);
            mesh.addAttribute("aVertexPosition", 2, [...p0, ...[-w, -h], ...p1]);
            e.ellipseMeshes.push(mesh);
        }

        a = conners[2];
        b = conners[3];
        if (a > 0 && b > 0) {
            let m = SdfEllipseMaterial.create(gl, program);
            center = [w - a, -h + b];
            m.setVertexScale(center[0], center[1], 1, 1);
            m.setEllipseAB(a, b);

            let mesh = Mesh.create(gl);
            mesh.setMaterial(m);
            mesh.setIndices([0, 1, 2]);
            mesh.addAttribute("aVertexPosition", 2, [...p2, ...[w, -h], ...p3]);
            e.ellipseMeshes.push(mesh);
        }

        a = conners[5];
        b = conners[4];
        if (a > 0 && b > 0) {
            let m = SdfEllipseMaterial.create(gl, program);
            center = [w - a, h - b];
            m.setVertexScale(center[0], center[1], 1, 1);
            m.setEllipseAB(a, b);

            let mesh = Mesh.create(gl);
            mesh.setMaterial(m);
            mesh.setIndices([0, 1, 2]);
            mesh.addAttribute("aVertexPosition", 2, [...p4, ...[w, h], ...p5]);
            e.ellipseMeshes.push(mesh);
        }

        a = conners[6];
        b = conners[7];
        if (a > 0 && b > 0) {
            let m = SdfEllipseMaterial.create(gl, program);
            center = [-w + a, h - b];
            m.setVertexScale(center[0], center[1], 1, 1);
            m.setEllipseAB(a, b);

            let mesh = Mesh.create(gl);
            mesh.setMaterial(m);
            mesh.setIndices([0, 1, 2]);
            mesh.addAttribute("aVertexPosition", 2, [...p6, ...[-w, h], ...p7]);
            e.ellipseMeshes.push(mesh);
        }

        return e;
    }

    constructor(gl) {
        this.gl = gl;
        this.colorMesh = null;
        this.ellipseMeshes = [];
    }

    setDrawCount(count) {
        if (this.colorMesh) {
            this.colorMesh.setDrawCount(count);
        }
        for (let m of this.ellipseMeshes) {
            m.setDrawCount(count);
        }
    }

    setColor(r, g, b, a) {
        if (this.colorMesh) {
            this.colorMesh.material.setColor(r, g, b, a);
        }
        for (let m of this.ellipseMeshes) {
            m.material.setColor(r, g, b, a);
        }
    }

    setWorldMatrix(mat) {
        if (this.colorMesh) {
            this.colorMesh.material.setWorldMatrix(mat);
        }
        for (let m of this.ellipseMeshes) {
            m.material.setWorldMatrix(mat);
        }
    }

    draw(camera) {
        if (this.colorMesh) {
            this.colorMesh.draw(camera);
        }

        for (let m of this.ellipseMeshes) {
            m.draw(camera);
        }
    }
}