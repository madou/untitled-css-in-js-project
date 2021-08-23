export {};

declare global {
  interface Window {
    runtime: {
      blueToIndigo: {
        from: string;
        to: string;
      };
      coralToPink: {
        from: string;
        to: string;
      };
      purpleToSlateBlue: {
        from: string;
        to: string;
      };
    };
  }
}

Object.assign(window, {
  runtime: {
    blueToIndigo: {
      from: 'blue',
      to: 'indigo',
    },
    coralToPink: {
      from: 'coral',
      to: 'pink',
    },
    purpleToSlateBlue: {
      from: 'purple',
      to: 'slateblue',
    },
  },
});
