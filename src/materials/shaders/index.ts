import pointcloud_vs from './pointcloud.vs?raw';
import pointcloud_fs from './pointcloud.fs?raw';
import edl_vs from './edl.vs?raw';
import edl_fs from './edl.fs?raw';
import normalize_vs from './normalize.vs?raw';
import normalize_fs from './normalize.fs?raw';
import normalize_and_edl_fs from './normalize_and_edl.fs?raw';
import blur_vs from './blur.vs?raw';
import blur_fs from './blur.fs?raw';

export const Shaders = {
  'pointcloud.vs': pointcloud_vs,
  'pointcloud.fs': pointcloud_fs,
  'edl.vs': edl_vs,
  'edl.fs': edl_fs,
  'normalize.vs': normalize_vs,
  'normalize.fs': normalize_fs,
  'normalize_and_edl.fs': normalize_and_edl_fs,
  'blur.vs': blur_vs,
  'blur.fs': blur_fs,
};
