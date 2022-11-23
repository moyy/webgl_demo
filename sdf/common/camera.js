class Camera {
    static create() {
        let c = new Camera();

        mat4.identity(c.uView);
        mat4.identity(c.uProj);

        return c;
    }

    constructor() {
        this.uView = mat4.create();
        this.uProj = mat4.create();
    }

    setSize(w, h) {
        mat4.ortho(this.uProj, 0, w, h, 0, -1.0, 1.0);
    }
}