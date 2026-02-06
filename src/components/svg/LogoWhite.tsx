import type { SVGProps } from 'react';

const SvgLogoWhite = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    fill="#fff"
    viewBox="0 0 100 100"
    {...props}
  >
    {/* Sun rays */}
    <circle cx={50} cy={20} r={5} fill="#fff" />
    <circle cx={80} cy={30} r={5} fill="#fff" />
    <circle cx={80} cy={70} r={5} fill="#fff" />
    <circle cx={50} cy={80} r={5} fill="#fff" />
    <circle cx={20} cy={70} r={5} fill="#fff" />
    <circle cx={20} cy={30} r={5} fill="#fff" />
    {/* Sun center */}
    <circle cx={50} cy={50} r={15} fill="#fff" />
  </svg>
);
export default SvgLogoWhite;
