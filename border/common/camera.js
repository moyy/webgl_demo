class Camera {
    static create(w, h) {
        let c = new Camera();

        mat4.identity(c.uView);
        mat4.ortho(c.uProj, 0, w, h, 0, -1.0, 1.0);

        return c;
    }

    constructor() {
        this.uView = mat4.create();
        this.uProj = mat4.create();
    }
}