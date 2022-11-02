/**
 * 圆角矩形
 */
class RoundRect {

    // TODO 这里 暂时 不处理 半径超过 宽高的情况
    // borderInfo = [左上, 左下, 右下，右上]
    // 左上 / 左下 / 右下 / 右上 = [宽度半径, 高度半径]
    // 处理方式，分成 4个椭圆 和 1个 凸-八边形
    static create(gl, w, h, borderInfo) {
        let e = new RoundRect(gl);

        // 左上角
        let lt = borderInfo[0];
        let p0 = [-w / 2 + lt[0], -h / 2];
        let p1 = [-w / 2, -h / 2 + lt[1]];

        // 左下角
        let lb = borderInfo[1];
        let p2 = [-w / 2, h / 2 - lb[1]];
        let p3 = [-w / 2 + lb[0], h / 2];

        // 右下角
        let rb = borderInfo[2];
        let p4 = [w / 2 - rb[0], h / 2];
        let p5 = [w / 2, h / 2 - rb[1]];

        // 右上角
        let rt = borderInfo[3];
        let p6 = [w / 2, -h / 2 + rt[1]];
        let p7 = [w / 2 - rt[0], -h / 2];

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
        e.colorMesh = new Mesh(gl, colorPosition, colorIndices, colorMaterial);

        // ============== 四个角的椭圆

        lt = [-w / 2, -h / 2];
        lb = [-w / 2, h / 2];
        rb = [w / 2, h / 2];
        rt = [w / 2, -h / 2];

        program = ProgramManager.getInstance().getProgram("sdf.vs", "sdf_ellipse.fs");

        let [bw, bh] = borderInfo[0];
        if (bw > 0 && bh > 0) {
            let m = SdfEllipseMaterial.create(gl, program);
            center = [-w / 2 + bw, -h / 2 + bh];
            m.setVertexScale(center[0], center[1], 1, 1);
            m.setEllipseAB(bw, bh);
            e.ellipseMeshes.push(new Mesh(gl, [...p0, ...lt, ...p1], [0, 1, 2], m));
        }

        [bw, bh] = borderInfo[1];
        if (bw > 0 && bh > 0) {
            let m = SdfEllipseMaterial.create(gl, program);
            center = [-w / 2 + bw, h / 2 - bh];
            m.setVertexScale(center[0], center[1], 1, 1);
            m.setEllipseAB(bw, bh);
            e.ellipseMeshes.push(new Mesh(gl, [...p2, ...lb, ...p3], [0, 1, 2], m));
        }

        [bw, bh] = borderInfo[2];
        if (bw > 0 && bh > 0) {
            let m = SdfEllipseMaterial.create(gl, program);
            center = [w / 2 - bw, h / 2 - bh];
            m.setVertexScale(center[0], center[1], 1, 1);
            m.setEllipseAB(bw, bh);
            e.ellipseMeshes.push(new Mesh(gl, [...p4, ...rb, ...p5], [0, 1, 2], m));
        }

        [bw, bh] = borderInfo[3];
        if (bw > 0 && bh > 0) {
            let m = SdfEllipseMaterial.create(gl, program);
            center = [w / 2 - bw, -h / 2 + bh];
            m.setVertexScale(center[0], center[1], 1, 1);
            m.setEllipseAB(bw, bh);
            e.ellipseMeshes.push(new Mesh(gl, [...p6, ...rt, ...p7], [0, 1, 2], m));
        }

        return e;
    }

    constructor(gl) {
        this.gl = gl;
        this.colorMesh = null;
        this.ellipseMeshes = [];
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

