class Mesh {
    constructor(gl, position, indices, material) {
        this.gl = gl;
        this.material = material;

        this.vbo = {};
        this.vbo.id = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.id);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(position), gl.STATIC_DRAW);

        this.vbo.itemSize = 2;
        this.vbo.numItems = position.length / this.vbo.itemSize;

        this.ibo = {};
        this.ibo.id = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo.id);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        this.ibo.itemSize = 1;
        this.ibo.numItems = indices.length;
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

        gl.drawElements(gl.TRIANGLES, this.ibo.numItems, gl.UNSIGNED_SHORT, 0);
    }
}