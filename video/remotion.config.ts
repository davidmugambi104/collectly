import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// The scenes are flat colour and text — CRF 18 keeps the type crisp without
// the file size a lossless render would produce.
Config.setCrf(18);
