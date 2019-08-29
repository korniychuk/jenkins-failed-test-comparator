declare interface Object {
  // Defined by Prototype.js
  toJSON?: (data: any) => string;
}

interface Window {
  ftcConfig?: import('./models').CustomConfig;
}
