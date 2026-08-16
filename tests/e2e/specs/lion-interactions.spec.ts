import { test, expect } from '../fixtures/potree';

// Behaviour tests for examples/lion.html: zoom, camera rotation, point-colour
// attribute, and point size. Driven at the API level (feeding OrbitControls
// deltas / setting material properties) so they are deterministic, then
// asserting that the viewer actually responded and kept rendering without
// runtime errors.

const dist3 = (
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

test.describe('examples/lion.html interactions', () => {
  test.beforeEach(async ({ viewerPage, runtimeErrors }) => {
    // Reference runtimeErrors so its listeners attach before navigation.
    void runtimeErrors;
    await viewerPage.goto('/examples/lion.html');
    await viewerPage.waitForPointCloudLoaded();
  });

  test('zoom moves the camera closer to the pivot', async ({
    viewerPage,
    runtimeErrors,
  }) => {
    const before = await viewerPage.readView();
    await viewerPage.zoomIn(0.5);
    const after = await viewerPage.readView();

    expect(after.radius, 'orbit radius shrinks on zoom-in').toBeLessThan(before.radius);
    expect(after.camDistToPivot, 'camera moves closer to the pivot').toBeLessThan(
      before.camDistToPivot,
    );
    // Zoom must not pan: the pivot stays put.
    expect(dist3(after.pivot, before.pivot), 'pivot unchanged by zoom').toBeLessThan(1e-2);

    expect(
      (await viewerPage.snapshot()).numVisiblePoints,
      'still rendering after zoom',
    ).toBeGreaterThan(0);
    expect(runtimeErrors).toEqual([]);
  });

  test('camera rotation changes yaw/pitch and moves the camera', async ({
    viewerPage,
    runtimeErrors,
  }) => {
    const before = await viewerPage.readView();
    await viewerPage.orbit(0.3, 0.15);
    const after = await viewerPage.readView();

    expect(
      Math.abs(after.yaw - before.yaw) + Math.abs(after.pitch - before.pitch),
      'orbit angles change on rotate',
    ).toBeGreaterThan(1e-3);
    expect(dist3(after.camPos, before.camPos), 'camera position moves on rotate').toBeGreaterThan(
      1e-3,
    );
    // Rotation orbits around the pivot: radius is preserved.
    expect(after.radius, 'radius preserved by rotation').toBeCloseTo(before.radius, 3);

    expect(
      (await viewerPage.snapshot()).numVisiblePoints,
      'still rendering after rotation',
    ).toBeGreaterThan(0);
    expect(runtimeErrors).toEqual([]);
  });

  test('changing the point colour attribute applies and keeps rendering', async ({
    viewerPage,
    runtimeErrors,
  }) => {
    const initial = await viewerPage.getActiveAttribute();
    const target = initial === 'elevation' ? 'rgba' : 'elevation';

    await viewerPage.setActiveAttribute(target);

    expect(await viewerPage.getActiveAttribute(), 'colour attribute switched').toBe(target);
    expect(
      (await viewerPage.snapshot()).numVisiblePoints,
      'still rendering after colour change',
    ).toBeGreaterThan(0);
    expect(runtimeErrors).toEqual([]);
  });

  test('switching the active attribute round-trips through the baked VAO', async ({
    viewerPage,
    runtimeErrors,
  }) => {
    // The renderer binds a pre-baked per-node VAO instead of re-specifying
    // vertexAttribPointer every frame. Switching the active attribute and
    // switching back must keep drawing every point cloud correctly — a
    // corrupted or stale VAO would drop points or raise a GL/runtime error.
    // lion's geometry attributes (position/rgba/normal) are all fixed-location,
    // so every hop exercises the primary-VAO ("just bind it") path.
    const start = await viewerPage.getActiveAttribute();
    expect(start, 'lion starts coloured by rgba').toBe('rgba');

    // rgba -> intensity -> rgba -> normal -> rgba, asserting rendering persists
    // and no runtime error is raised after each recompile + VAO bind.
    for (const attr of ['intensity', 'rgba', 'normal', 'rgba']) {
      await viewerPage.setActiveAttribute(attr);
      expect(await viewerPage.getActiveAttribute(), `active attribute is ${attr}`).toBe(attr);
      expect(
        (await viewerPage.snapshot()).numVisiblePoints,
        `still rendering after switching to ${attr}`,
      ).toBeGreaterThan(0);
      expect(runtimeErrors, `no runtime error after switching to ${attr}`).toEqual([]);
    }

    // Round-trip must return to the original colouring, still drawing.
    expect(await viewerPage.getActiveAttribute(), 'returned to rgba').toBe('rgba');
    expect(
      (await viewerPage.snapshot()).numVisiblePoints,
      'still rendering after full round-trip',
    ).toBeGreaterThan(0);
    expect(runtimeErrors).toEqual([]);
  });

  test('changing the point size applies and keeps rendering', async ({
    viewerPage,
    runtimeErrors,
  }) => {
    const before = await viewerPage.getPointSize();
    const target = before + 3;

    await viewerPage.setPointSize(target);

    expect(await viewerPage.getPointSize(), 'point size updated').toBe(target);
    expect(
      (await viewerPage.snapshot()).numVisiblePoints,
      'still rendering after size change',
    ).toBeGreaterThan(0);
    expect(runtimeErrors).toEqual([]);
  });
});
