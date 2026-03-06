import { Vector3, Box3, Line3, Matrix4, Mesh, BoxGeometry, CylinderGeometry, MeshBasicMaterial } from "three";
import { MeshBVH, StaticGeometryGenerator } from "three-mesh-bvh";

// Reusable objects to avoid GC
const tempVector = new Vector3();
const tempVector2 = new Vector3();
const tempBox = new Box3();
const tempMat = new Matrix4();
const tempSegment = new Line3();

/**
 * Kart collision settings
 */
export const kartColliderSettings = {
  // Capsule dimensions (used for collision)
  radius: 0.8,
  height: 1.0,
  // How much to push out when colliding
  pushOutMultiplier: 1.0,
};

/**
 * Build a BVH collider from a group of meshes
 * @param {THREE.Group} group - The group containing wall/obstacle meshes
 * @param {string[]} includeNames - Names of meshes to include (if empty, includes all)
 * @param {string[]} excludeNames - Names of meshes to exclude
 * @returns {THREE.Mesh} - A mesh with BVH attached to its geometry
 */
export function buildCollider(group, includeNames = [], excludeNames = ["ground"]) {
  const meshes = [];

  group.traverse((child) => {
    if (!child.isMesh) return;

    // Check exclusions
    const isExcluded = excludeNames.some((name) =>
      child.name.toLowerCase().includes(name.toLowerCase())
    );
    if (isExcluded) return;

    // Check inclusions (if specified)
    if (includeNames.length > 0) {
      const isIncluded = includeNames.some((name) =>
        child.name.toLowerCase().includes(name.toLowerCase())
      );
      if (!isIncluded) return;
    }

    meshes.push(child);
  });

  if (meshes.length === 0) {
    console.warn("KartCollision: No meshes found for collision");
    return null;
  }

  // Create a static geometry from all meshes
  const staticGenerator = new StaticGeometryGenerator(meshes);
  staticGenerator.attributes = ["position"];

  const mergedGeometry = staticGenerator.generate();
  mergedGeometry.boundsTree = new MeshBVH(mergedGeometry);

  const collider = new Mesh(mergedGeometry);
  collider.visible = false;

  console.log(`KartCollision: Built collider from ${meshes.length} meshes`);
  return collider;
}

/**
 * Check collision and return adjusted position
 * Uses capsule collision similar to three-mesh-bvh character example
 * 
 * @param {Vector3} currentPosition - Current kart position
 * @param {Vector3} desiredPosition - Where the kart wants to move
 * @param {THREE.Mesh} collider - The BVH collider mesh
 * @param {Object} settings - Collision settings
 * @returns {{ position: Vector3, collided: boolean }} - Adjusted position and collision flag
 */
export function checkCollision(
  currentPosition,
  desiredPosition,
  collider,
  settings = kartColliderSettings
) {
  if (!collider || !collider.geometry.boundsTree) {
    return { position: desiredPosition.clone(), collided: false };
  }

  const result = {
    position: desiredPosition.clone(),
    collided: false,
  };

  // Create capsule segment at desired position
  // Capsule goes from bottom to top of kart
  const capsuleInfo = {
    radius: settings.radius,
    segment: new Line3(
      new Vector3(0, settings.radius, 0),
      new Vector3(0, settings.height, 0)
    ),
  };

  // Transform to collider's local space
  tempMat.copy(collider.matrixWorld).invert();
  tempSegment.copy(capsuleInfo.segment);

  // Move segment to desired position
  tempSegment.start.add(desiredPosition).applyMatrix4(tempMat);
  tempSegment.end.add(desiredPosition).applyMatrix4(tempMat);

  // Get bounding box of capsule
  tempBox.makeEmpty();
  tempBox.expandByPoint(tempSegment.start);
  tempBox.expandByPoint(tempSegment.end);
  tempBox.min.addScalar(-capsuleInfo.radius);
  tempBox.max.addScalar(capsuleInfo.radius);

  // Check collision with BVH
  collider.geometry.boundsTree.shapecast({
    intersectsBounds: (box) => box.intersectsBox(tempBox),

    intersectsTriangle: (tri) => {
      // Find closest points between triangle and capsule segment
      const triPoint = tempVector;
      const capsulePoint = tempVector2;

      const distance = tri.closestPointToSegment(
        tempSegment,
        triPoint,
        capsulePoint
      );

      if (distance < capsuleInfo.radius) {
        // Collision detected - push out
        const depth = capsuleInfo.radius - distance;
        const direction = capsulePoint.sub(triPoint).normalize();

        tempSegment.start.addScaledVector(direction, depth * settings.pushOutMultiplier);
        tempSegment.end.addScaledVector(direction, depth * settings.pushOutMultiplier);

        result.collided = true;
      }
    },
  });

  if (result.collided) {
    // Get adjusted position in world space
    const newPosition = tempSegment.start.clone().applyMatrix4(collider.matrixWorld);
    // Only adjust X and Z, keep Y from desired position (ground handling is separate)
    result.position.x = newPosition.x;
    result.position.z = newPosition.z;
  }

  return result;
}

/**
 * Simple box-based horizontal collision check
 * Faster than capsule but less accurate
 * 
 * @param {Vector3} position - Current position
 * @param {Vector3} velocity - Movement vector
 * @param {THREE.Mesh} collider - The BVH collider mesh
 * @param {number} radius - Collision radius
 * @returns {{ position: Vector3, velocity: Vector3, collided: boolean }}
 */
export function checkSimpleCollision(position, velocity, collider, radius = 1.0) {
  if (!collider || !collider.geometry.boundsTree) {
    return {
      position: position.clone().add(velocity),
      velocity: velocity.clone(),
      collided: false,
    };
  }

  const result = {
    position: position.clone(),
    velocity: velocity.clone(),
    collided: false,
  };

  // Check collision at new position
  const newPosition = position.clone().add(velocity);
  
  tempMat.copy(collider.matrixWorld).invert();
  const localPos = newPosition.clone().applyMatrix4(tempMat);

  // Create small box around position
  tempBox.setFromCenterAndSize(
    localPos,
    new Vector3(radius * 2, radius * 2, radius * 2)
  );

  collider.geometry.boundsTree.shapecast({
    intersectsBounds: (box) => box.intersectsBox(tempBox),

    intersectsTriangle: (tri) => {
      // Get triangle normal for push direction
      const normal = tri.getNormal(tempVector);
      
      // Check if we're inside the triangle's influence
      const triCenter = tempVector2;
      tri.getMidpoint(triCenter);
      
      const distToTri = localPos.distanceTo(triCenter);
      if (distToTri < radius * 2) {
        // Push out along normal
        result.velocity.addScaledVector(
          normal.applyMatrix4(collider.matrixWorld).normalize(),
          -result.velocity.dot(normal) * 1.1
        );
        result.collided = true;
      }
    },
  });

  result.position.add(result.velocity);
  return result;
}

/**
 * Create a wall/barrier mesh for collision
 * @param {number} width - Width of wall
 * @param {number} height - Height of wall
 * @param {number} depth - Depth/thickness of wall
 * @param {boolean} visible - Whether to show the wall (for debugging)
 * @returns {THREE.Mesh}
 */
export function createWallCollider(width, height, depth, visible = false) {
  const geometry = new BoxGeometry(width, height, depth);
  const material = new MeshBasicMaterial({
    color: 0xff0000,
    wireframe: true,
    visible: visible,
  });
  const wall = new Mesh(geometry, material);
  wall.name = "collision_wall";
  return wall;
}

/**
 * Create a cylindrical pillar collider
 * @param {number} radius - Radius of cylinder
 * @param {number} height - Height of cylinder
 * @param {boolean} visible - Whether to show (for debugging)
 * @returns {THREE.Mesh}
 */
export function createPillarCollider(radius, height, visible = false) {
  const geometry = new CylinderGeometry(radius, radius, height, 16);
  const material = new MeshBasicMaterial({
    color: 0xff0000,
    wireframe: true,
    visible: visible,
  });
  const pillar = new Mesh(geometry, material);
  pillar.name = "collision_pillar";
  return pillar;
}

/**
 * Build BVH collider from an array of collision meshes
 * @param {THREE.Mesh[]} meshes - Array of collision meshes
 * @returns {THREE.Mesh} - Combined collider with BVH
 */
export function buildColliderFromMeshes(meshes) {
  if (!meshes || meshes.length === 0) {
    console.warn("KartCollision: No meshes provided");
    return null;
  }

  const staticGenerator = new StaticGeometryGenerator(meshes);
  staticGenerator.attributes = ["position"];

  const mergedGeometry = staticGenerator.generate();
  mergedGeometry.boundsTree = new MeshBVH(mergedGeometry);

  const collider = new Mesh(mergedGeometry);
  collider.visible = false;

  console.log(`KartCollision: Built collider from ${meshes.length} meshes`);
  return collider;
}

