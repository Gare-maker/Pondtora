import svgPaths from "./svg-gptxdeckl2";
import imgLogo from "./efd37f2fdf789ba342a73e52a57e1d4e651320a0.png";
import imgChatGptImageAug82026121423Pm1 from "./19ec6c9307dcf54003086a80f9f0e6ec326a2147.png";
import imgImage6 from "./fd70935fd24257e0a0956e9066f90af718cfeccd.png";
import imgChatGptImageAug82026121423Pm2 from "./21d9a0f93952ff7aad98b506f976f1d7631ce3b2.png";
import imgImage from "./70f88f554c8726ab60a076cad04ec069ad3408a3.png";
import imgImage1 from "./a4e0040e80a5303e6271d1fe39a8dcf50309f41f.png";

function Component() {
  return (
    <div className="content-stretch flex gap-[8px] h-[37.647px] items-center relative shrink-0" data-name="Component 1">
      <div className="relative shrink-0 size-[46px]" data-name="logo">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgLogo} />
      </div>
      <p className="[word-break:break-word] font-['Barlow_Condensed:Medium',sans-serif] leading-[34.51px] not-italic relative shrink-0 text-[#070707] text-[26px] tracking-[-0.52px] whitespace-nowrap">Pondtora</p>
    </div>
  );
}

function Content() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" data-name="Content">
      <Component />
    </div>
  );
}

function Column() {
  return (
    <div className="[word-break:break-word] content-stretch flex font-['Barlow:Regular',sans-serif] gap-[32px] items-center justify-center leading-[24px] not-italic overflow-clip relative shrink-0 text-[#141414] text-[16px] w-[322px] whitespace-nowrap" data-name="Column">
      <p className="relative shrink-0">Home</p>
      <p className="relative shrink-0">About Us</p>
      <p className="relative shrink-0">Features</p>
      <p className="relative shrink-0">Pricing</p>
    </div>
  );
}

function Frame49() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[10px] items-center justify-end min-w-px relative">
      <div className="relative rounded-[12px] shrink-0 w-[161px]" data-name="Secondary Action">
        <div aria-hidden className="absolute border border-[#00a63e] border-solid inset-[-1px] pointer-events-none rounded-[13px]" />
        <div className="flex flex-row items-center justify-center size-full">
          <div className="content-stretch flex items-center justify-center px-[20px] py-[8px] relative size-full">
            <p className="[word-break:break-word] font-['Roboto:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#00a63e] text-[16px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
              Login
            </p>
          </div>
        </div>
      </div>
      <div className="bg-[#00a63e] relative rounded-[12px] shrink-0" data-name="Secondary Action">
        <div aria-hidden className="absolute border border-[#00a63e] border-solid inset-[-1px] pointer-events-none rounded-[13px]" />
        <div className="flex flex-row items-center justify-center size-full">
          <div className="content-stretch flex items-center justify-center px-[20px] py-[8px] relative size-full">
            <p className="[word-break:break-word] font-['Roboto:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[16px] text-white whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
              Try Free for 30 Days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Container() {
  return (
    <div className="bg-white content-stretch flex items-center justify-center py-[16px] relative rounded-[24px] shrink-0 w-[1360px]" data-name="Container">
      <Content />
      <Column />
      <Frame49 />
    </div>
  );
}

function Nav() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center overflow-clip pt-[16px] px-[24px] relative shrink-0 w-full" data-name="Nav">
      <Container />
    </div>
  );
}

function Tag() {
  return (
    <div className="content-stretch flex items-center justify-center px-[12px] py-[6px] relative rounded-[8px] shrink-0" data-name="Tag">
      <div aria-hidden className="absolute border border-[#093628] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#093628] text-[16px] whitespace-nowrap">Built for Smarter Fish Farming</p>
    </div>
  );
}

function Frame30() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0 w-full">
      <Tag />
      <p className="[word-break:break-word] font-['Barlow_Condensed:Medium',sans-serif] leading-[0] min-w-full not-italic relative shrink-0 text-[#758681] text-[0px] tracking-[-1.44px] w-[min-content]">
        <span className="leading-[80px] text-[72px]">{`Manage Your `}</span>
        <span className="font-['Barlow_Condensed:SemiBold',sans-serif] leading-[80px] text-[#151515] text-[72px]">{`Fish Farm. `}</span>
        <span className="leading-[80px] text-[72px]">Track Your Growth. Increase Your Profits.</span>
      </p>
    </div>
  );
}

function Frame31() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full">
      <Frame30 />
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[28px] not-italic relative shrink-0 text-[#093628] text-[18px] w-full">Everything you need to manage your fish farm, from pond stocking and feeding to expenses, inventory, harvests, and sales, all in one place.</p>
    </div>
  );
}

function Column1() {
  return (
    <div className="content-stretch flex flex-col gap-[40px] items-start justify-center overflow-clip relative shrink-0 w-[588px]" data-name="Column">
      <Frame31 />
      <div className="backdrop-blur-[8px] bg-[#00a63e] relative rounded-[12px] shrink-0" data-name="Secondary Action">
        <div aria-hidden className="absolute border border-[#00a63e] border-solid inset-[-1px] pointer-events-none rounded-[13px]" />
        <div className="flex flex-row items-center justify-center size-full">
          <div className="content-stretch flex items-center justify-center px-[20px] py-[12px] relative size-full">
            <p className="[word-break:break-word] font-['Roboto:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[16px] text-white whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
              Try Pondtora Free for 30 Days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame59() {
  return (
    <div className="absolute h-[906px] left-[671px] overflow-clip top-[-194.5px] w-[719px]">
      <div className="absolute h-[1531px] left-[-470px] top-[-118px] w-[2296px]" data-name="ChatGPT Image Aug 8, 2026, 12_14_23 PM 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgChatGptImageAug82026121423Pm1} />
      </div>
    </div>
  );
}

function Frame61() {
  return (
    <div className="content-stretch flex gap-[110px] items-end relative shrink-0 w-[1254px]">
      <Column1 />
      <Frame59 />
    </div>
  );
}

function Frame29() {
  return (
    <div className="content-stretch flex gap-[80px] h-[835px] items-center overflow-clip px-[60px] py-[96px] relative shrink-0 w-full">
      <Frame61 />
      <div className="absolute h-[711.579px] left-[816px] shadow-[0px_12.866px_260.538px_0px_rgba(139,139,139,0.25)] top-[268px] w-[933.771px]" data-name="image 6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute h-[125.88%] left-[-2.58%] max-w-none top-[-15.48%] w-[170.53%]" src={imgImage6} />
        </div>
      </div>
      <div className="absolute h-[605px] left-[687px] shadow-[0px_9.641px_195.232px_0px_rgba(139,139,139,0.25)] top-[381px] w-[278px]" data-name="image 7">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute h-[125.8%] left-[-7.36%] max-w-none top-[-15.47%] w-[486.9%]" src={imgImage6} />
        </div>
      </div>
    </div>
  );
}

function Frame56() {
  return (
    <div className="bg-white content-stretch flex flex-col items-start overflow-clip relative shrink-0 w-[1440px]">
      <Nav />
      <Frame29 />
    </div>
  );
}

function Frame62() {
  return (
    <div className="h-[659px] overflow-clip relative shrink-0 w-full">
      <div className="absolute bg-[rgba(22,179,100,0.41)] h-[503px] left-0 rounded-[8px] top-0 w-[655px]" data-name="Placeholder Image" />
      <div className="absolute h-[879px] left-px top-[-74px] w-[1319px]" data-name="ChatGPT Image Aug 8, 2026, 12_14_23 PM 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgChatGptImageAug82026121423Pm2} />
      </div>
    </div>
  );
}

function Frame33() {
  return (
    <div className="content-stretch flex flex-col items-start justify-center relative shrink-0">
      <p className="[word-break:break-word] font-['Barlow:SemiBold',sans-serif] leading-[33.6px] not-italic relative shrink-0 text-[#30403e] text-[28px] whitespace-nowrap">About Us</p>
    </div>
  );
}

function Content1() {
  return (
    <div className="content-stretch flex items-start justify-between pt-[20px] relative shrink-0 w-full" data-name="Content">
      <div aria-hidden className="absolute border-[#51615f] border-solid border-t inset-0 pointer-events-none" />
      <Frame33 />
      <div className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[0] not-italic relative shrink-0 text-[#30403e] text-[36px] tracking-[-2px] w-[865px] whitespace-pre-wrap">
        <p className="leading-[1.25] mb-0">Pondtora is a farm management platform built to help fish farmers manage their entire farm from one place.</p>
        <p className="leading-[1.25] mb-0">​</p>
        <p className="mb-0">
          <span className="leading-[1.25]">{`From pond and fish stock management to `}</span>
          <span className="[word-break:break-word] font-['Barlow:Bold',sans-serif] leading-[1.25] not-italic">{`feed inventory, feeding records, finances, sales, invoices, reports, and staff management, `}</span>
          <span className="leading-[1.25]">Pondtora keeps your farm operations organized and your records accessible.</span>
        </p>
        <p className="leading-[1.25] mb-0">​</p>
        <p>
          <span className="[word-break:break-word] font-['Barlow:Bold',sans-serif] leading-[1.25] not-italic">{`Our goal is simple: `}</span>
          <span className="leading-[1.25]">help farmers spend less time managing paperwork and more time making better decisions for their farm.</span>
        </p>
      </div>
    </div>
  );
}

function Event() {
  return (
    <div className="bg-[#f0fdf4] content-stretch flex flex-col gap-[80px] items-center justify-center overflow-clip px-[60px] py-[112px] relative shrink-0 w-[1440px]" data-name="Event / 14 /">
      <Frame62 />
      <Content1 />
    </div>
  );
}

function Frame55() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0">
      <Event />
    </div>
  );
}

function Tag1() {
  return (
    <div className="content-stretch flex items-center justify-center px-[12px] py-[6px] relative rounded-[8px] shrink-0" data-name="Tag">
      <div aria-hidden className="absolute border border-[#414651] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <p className="[word-break:break-word] font-['Barlow:Regular',sans-serif] leading-[1.5] not-italic relative shrink-0 text-[#414651] text-[16px] whitespace-nowrap">Features</p>
    </div>
  );
}

function Frame18() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start justify-center relative shrink-0 w-[650px]">
      <Tag1 />
      <p className="[word-break:break-word] font-['Barlow_Condensed:Medium',sans-serif] leading-[72px] min-w-full not-italic relative shrink-0 text-[#181d27] text-[60px] tracking-[-1.2px] w-[min-content]">What we offer</p>
    </div>
  );
}

function Frame28() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="flex flex-row justify-center size-full">
        <div className="content-stretch flex items-start justify-between px-[60px] relative size-full">
          <Frame18 />
          <p className="[word-break:break-word] font-['Barlow:Regular',sans-serif] leading-[1.5] not-italic relative shrink-0 text-[#093628] text-[16px] w-[575px]">Everything you need to manage your fish farm, track daily operations, and make better decisions, all in one place.</p>
        </div>
      </div>
    </div>
  );
}

function Frame20() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-start not-italic relative shrink-0 w-full">
      <p className="font-['Barlow_Condensed:Medium',sans-serif] leading-[38px] min-w-full relative shrink-0 text-[#181d27] text-[30px] w-[min-content]">Financial Dashboard</p>
      <p className="font-['Barlow:Regular',sans-serif] leading-[24px] relative shrink-0 text-[#414651] text-[16px] w-[435px]">Get a clear view of your farm’s financial activities, track where your money goes, and understand how your revenue compares with your costs.</p>
    </div>
  );
}

function Frame34() {
  return (
    <div className="content-stretch flex flex-col items-start justify-end relative shrink-0 w-full">
      <Frame20 />
    </div>
  );
}

function Frame45() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Add Expense</p>
    </div>
  );
}

function Frame46() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Add Revenue</p>
    </div>
  );
}

function Frame48() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">See Where Your Money Goes</p>
    </div>
  );
}

function Frame50() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Compare Revenue and Cost</p>
    </div>
  );
}

function Frame51() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Download Financial Report</p>
    </div>
  );
}

function Frame47() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0">
      <Frame45 />
      <Frame46 />
      <Frame48 />
      <Frame50 />
      <Frame51 />
    </div>
  );
}

function ContainerTitle() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[34px] items-start justify-center min-h-px relative w-full" data-name="Container title">
      <Frame34 />
      <Frame47 />
    </div>
  );
}

function Content2() {
  return (
    <div className="flex-[1_0_0] h-full min-w-px relative rounded-[8px]" data-name="Content">
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col items-start justify-center py-[20px] relative size-full">
          <ContainerTitle />
        </div>
      </div>
    </div>
  );
}

function Frame44() {
  return (
    <div className="bg-[#f0fdf4] h-full relative rounded-br-[8px] rounded-tr-[8px] shrink-0 w-[800px]">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start p-[46.878px] relative size-full">
          <div className="-translate-x-1/2 -translate-y-1/2 absolute h-[460px] left-[calc(50%+16.5px)] shadow-[0px_35.808px_725.116px_0px_rgba(139,139,139,0.25)] top-[calc(50%+27.07px)] w-[767px]" data-name="image 3">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img alt="" className="absolute h-[166.87%] left-[-2.69%] max-w-none top-[-20.53%] w-[177.99%]" src={imgImage6} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[24px] items-start min-h-px overflow-clip relative w-full" data-name="Card">
      <Content2 />
      <Frame44 />
    </div>
  );
}

function Frame21() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-start not-italic relative shrink-0 w-full">
      <p className="font-['Barlow_Condensed:Medium',sans-serif] leading-[38px] min-w-full relative shrink-0 text-[#181d27] text-[30px] w-[min-content]">Pond Management</p>
      <p className="font-['Barlow:Regular',sans-serif] leading-[24px] relative shrink-0 text-[#414651] text-[16px] w-[435px]">Manage everything related to your fish stock, from creating ponds and recording stock to tracking mortality, treatments, disease outbreaks, and fish movement between ponds.</p>
    </div>
  );
}

function Frame36() {
  return (
    <div className="content-stretch flex flex-col items-start justify-end relative shrink-0 w-full">
      <Frame21 />
    </div>
  );
}

function Frame53() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Create Pond</p>
    </div>
  );
}

function Frame54() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Add Fish Stock</p>
    </div>
  );
}

function Frame57() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">View Fish Stock History</p>
    </div>
  );
}

function Frame58() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">View Fish Stock Details</p>
    </div>
  );
}

function Frame63() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Log and Track Mortality</p>
    </div>
  );
}

function Frame64() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Transfer Fish Stock From One Pond to Another</p>
    </div>
  );
}

function Frame65() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Log Treatment and Disease Outbreak</p>
    </div>
  );
}

function Frame52() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0">
      <Frame53 />
      <Frame54 />
      <Frame57 />
      <Frame58 />
      <Frame63 />
      <Frame64 />
      <Frame65 />
    </div>
  );
}

function ContainerTitle1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[34px] items-start justify-center min-h-px relative w-full" data-name="Container title">
      <Frame36 />
      <Frame52 />
    </div>
  );
}

function Content3() {
  return (
    <div className="flex-[1_0_0] h-full min-w-px relative rounded-[8px]" data-name="Content">
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col items-start justify-center py-[20px] relative size-full">
          <ContainerTitle1 />
        </div>
      </div>
    </div>
  );
}

function Frame66() {
  return (
    <div className="bg-[#f0fdf4] h-full relative rounded-br-[8px] rounded-tr-[8px] shrink-0 w-[800px]">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start p-[46.878px] relative size-full">
          <div className="-translate-x-1/2 -translate-y-1/2 absolute h-[460px] left-[calc(50%+16.5px)] shadow-[0px_35.808px_725.116px_0px_rgba(139,139,139,0.25)] top-[calc(50%+27.07px)] w-[767px]" data-name="image 3">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img alt="" className="absolute h-[166.87%] left-[-2.69%] max-w-none top-[-20.53%] w-[177.99%]" src={imgImage6} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[24px] items-start min-h-px overflow-clip relative w-full" data-name="Card">
      <Content3 />
      <Frame66 />
    </div>
  );
}

function Frame22() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-start not-italic relative shrink-0 w-full">
      <p className="font-['Barlow_Condensed:Medium',sans-serif] leading-[38px] min-w-full relative shrink-0 text-[#181d27] text-[30px] w-[min-content]">Feed Inventory</p>
      <p className="font-['Barlow:Regular',sans-serif] leading-[24px] relative shrink-0 text-[#414651] text-[16px] w-[435px]">Keep your feed records organized by tracking purchases, available stock, and feed requirements so you always know what you have and what your farm needs.</p>
    </div>
  );
}

function Frame37() {
  return (
    <div className="content-stretch flex flex-col items-start justify-end relative shrink-0 w-full">
      <Frame22 />
    </div>
  );
}

function Frame68() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Add and Manage Feed Inventory</p>
    </div>
  );
}

function Frame69() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">View Purchase History</p>
    </div>
  );
}

function Frame70() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Manage Stock</p>
    </div>
  );
}

function Frame71() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Feed Requirement Calculator</p>
    </div>
  );
}

function Frame67() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0">
      <Frame68 />
      <Frame69 />
      <Frame70 />
      <Frame71 />
    </div>
  );
}

function ContainerTitle2() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[34px] items-start justify-center min-h-px relative w-full" data-name="Container title">
      <Frame37 />
      <Frame67 />
    </div>
  );
}

function Content4() {
  return (
    <div className="flex-[1_0_0] h-full min-w-px relative rounded-[8px]" data-name="Content">
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col items-start justify-center py-[20px] relative size-full">
          <ContainerTitle2 />
        </div>
      </div>
    </div>
  );
}

function Frame72() {
  return (
    <div className="bg-[#f0fdf4] h-full relative rounded-br-[8px] rounded-tr-[8px] shrink-0 w-[800px]">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start p-[46.878px] relative size-full">
          <div className="-translate-x-1/2 -translate-y-1/2 absolute h-[460px] left-[calc(50%+16.5px)] shadow-[0px_35.808px_725.116px_0px_rgba(139,139,139,0.25)] top-[calc(50%+27.07px)] w-[767px]" data-name="image 3">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img alt="" className="absolute h-[166.87%] left-[-2.69%] max-w-none top-[-20.53%] w-[177.99%]" src={imgImage6} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card2() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[24px] items-start min-h-px overflow-clip relative w-full" data-name="Card">
      <Content4 />
      <Frame72 />
    </div>
  );
}

function Frame23() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-start not-italic relative shrink-0 w-full">
      <p className="font-['Barlow_Condensed:Medium',sans-serif] leading-[38px] min-w-full relative shrink-0 text-[#181d27] text-[30px] w-[min-content]">Feeding Documentation</p>
      <p className="font-['Barlow:Regular',sans-serif] leading-[24px] relative shrink-0 text-[#414651] text-[16px] w-[435px]">Record your daily feeding activities and reconcile feed usage to keep your records accurate and easily identify mistakes in your entries.</p>
    </div>
  );
}

function Frame38() {
  return (
    <div className="content-stretch flex flex-col items-start justify-end relative shrink-0 w-full">
      <Frame23 />
    </div>
  );
}

function Frame74() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Log Daily Feed</p>
    </div>
  );
}

function Frame75() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Log Bags Opened Each Day</p>
    </div>
  );
}

function Frame76() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Log Remaining Feed</p>
    </div>
  );
}

function Frame77() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Reconciliation to Detect Incorrect Data</p>
    </div>
  );
}

function Frame78() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Correct Errors While Logging</p>
    </div>
  );
}

function Frame73() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0">
      <Frame74 />
      <Frame75 />
      <Frame76 />
      <Frame77 />
      <Frame78 />
    </div>
  );
}

function ContainerTitle3() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[34px] items-start justify-center min-h-px relative w-full" data-name="Container title">
      <Frame38 />
      <Frame73 />
    </div>
  );
}

function Content5() {
  return (
    <div className="flex-[1_0_0] h-full min-w-px relative rounded-[8px]" data-name="Content">
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col items-start justify-center py-[20px] relative size-full">
          <ContainerTitle3 />
        </div>
      </div>
    </div>
  );
}

function Frame79() {
  return (
    <div className="bg-[#f0fdf4] h-full relative rounded-br-[8px] rounded-tr-[8px] shrink-0 w-[800px]">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start p-[46.878px] relative size-full">
          <div className="-translate-x-1/2 -translate-y-1/2 absolute h-[460px] left-[calc(50%+16.5px)] shadow-[0px_35.808px_725.116px_0px_rgba(139,139,139,0.25)] top-[calc(50%+27.07px)] w-[767px]" data-name="image 3">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img alt="" className="absolute h-[166.87%] left-[-2.69%] max-w-none top-[-20.53%] w-[177.99%]" src={imgImage6} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card3() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[24px] items-start min-h-px overflow-clip relative w-full" data-name="Card">
      <Content5 />
      <Frame79 />
    </div>
  );
}

function Frame24() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-start not-italic relative shrink-0 w-full">
      <p className="font-['Barlow_Condensed:Medium',sans-serif] leading-[38px] min-w-full relative shrink-0 text-[#181d27] text-[30px] w-[min-content]">Reports</p>
      <p className="font-['Barlow:Regular',sans-serif] leading-[24px] relative shrink-0 text-[#414651] text-[16px] w-[435px]">Turn your farm records into useful reports that help you monitor staff activities and understand what is happening across your farm over different periods.</p>
    </div>
  );
}

function Frame39() {
  return (
    <div className="content-stretch flex flex-col items-start justify-end relative shrink-0 w-full">
      <Frame24 />
    </div>
  );
}

function Frame81() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Staff Daily Report</p>
    </div>
  );
}

function Frame82() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Staff Weekly Report</p>
    </div>
  );
}

function Frame83() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Staff Monthly Report</p>
    </div>
  );
}

function Frame80() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0">
      <Frame81 />
      <Frame82 />
      <Frame83 />
    </div>
  );
}

function ContainerTitle4() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[34px] items-start justify-center min-h-px relative w-full" data-name="Container title">
      <Frame39 />
      <Frame80 />
    </div>
  );
}

function Content6() {
  return (
    <div className="flex-[1_0_0] h-full min-w-px relative rounded-[8px]" data-name="Content">
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col items-start justify-center py-[20px] relative size-full">
          <ContainerTitle4 />
        </div>
      </div>
    </div>
  );
}

function Frame84() {
  return (
    <div className="bg-[#f0fdf4] h-full relative rounded-br-[8px] rounded-tr-[8px] shrink-0 w-[800px]">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start p-[46.878px] relative size-full">
          <div className="-translate-x-1/2 -translate-y-1/2 absolute h-[460px] left-[calc(50%+16.5px)] shadow-[0px_35.808px_725.116px_0px_rgba(139,139,139,0.25)] top-[calc(50%+27.07px)] w-[767px]" data-name="image 3">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img alt="" className="absolute h-[166.87%] left-[-2.69%] max-w-none top-[-20.53%] w-[177.99%]" src={imgImage6} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card4() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[24px] items-start min-h-px overflow-clip relative w-full" data-name="Card">
      <Content6 />
      <Frame84 />
    </div>
  );
}

function Frame25() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-start not-italic relative shrink-0 w-full">
      <p className="font-['Barlow_Condensed:Medium',sans-serif] leading-[38px] min-w-full relative shrink-0 text-[#181d27] text-[30px] w-[min-content]">Invoice</p>
      <p className="font-['Barlow:Regular',sans-serif] leading-[24px] relative shrink-0 text-[#414651] text-[16px] w-[435px]">Create professional invoices for your fish sales, configure your business details, and apply your preferred pricing groups to sales.</p>
    </div>
  );
}

function Frame40() {
  return (
    <div className="content-stretch flex flex-col items-start justify-end relative shrink-0 w-full">
      <Frame25 />
    </div>
  );
}

function Frame86() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Set Invoice Display Name and Bank Account Details</p>
    </div>
  );
}

function Frame87() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px] whitespace-pre-wrap">{`Generate Send and  Invoice`}</p>
    </div>
  );
}

function Frame88() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Set a Price Group for All Fish Sizes During Sales</p>
    </div>
  );
}

function Frame85() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0">
      <Frame86 />
      <Frame87 />
      <Frame88 />
    </div>
  );
}

function ContainerTitle5() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[34px] items-start justify-center min-h-px relative w-full" data-name="Container title">
      <Frame40 />
      <Frame85 />
    </div>
  );
}

function Content7() {
  return (
    <div className="flex-[1_0_0] h-full min-w-px relative rounded-[8px]" data-name="Content">
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col items-start justify-center py-[20px] relative size-full">
          <ContainerTitle5 />
        </div>
      </div>
    </div>
  );
}

function Frame89() {
  return (
    <div className="bg-[#f0fdf4] h-full relative rounded-br-[8px] rounded-tr-[8px] shrink-0 w-[800px]">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start p-[46.878px] relative size-full">
          <div className="-translate-x-1/2 -translate-y-1/2 absolute h-[460px] left-[calc(50%+16.5px)] shadow-[0px_35.808px_725.116px_0px_rgba(139,139,139,0.25)] top-[calc(50%+27.07px)] w-[767px]" data-name="image 3">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img alt="" className="absolute h-[166.87%] left-[-2.69%] max-w-none top-[-20.53%] w-[177.99%]" src={imgImage6} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card5() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[24px] items-start min-h-px overflow-clip relative w-full" data-name="Card">
      <Content7 />
      <Frame89 />
    </div>
  );
}

function Frame26() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-start not-italic relative shrink-0 w-full">
      <p className="font-['Barlow_Condensed:Medium',sans-serif] leading-[38px] min-w-full relative shrink-0 text-[#181d27] text-[30px] w-[min-content]">Staff</p>
      <p className="font-['Barlow:Regular',sans-serif] leading-[24px] relative shrink-0 text-[#414651] text-[16px] w-[435px]">Bring your farm team into one system, assign staff to your farm, and control which features and pages each person can access.</p>
    </div>
  );
}

function Frame41() {
  return (
    <div className="content-stretch flex flex-col items-start justify-end relative shrink-0 w-full">
      <Frame26 />
    </div>
  );
}

function Frame91() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[435px]">Add Staff to Manage Your Farm</p>
    </div>
  );
}

function Frame92() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[370px]">Control Staff Access to Features and Pages on the Web App</p>
    </div>
  );
}

function Frame90() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
      <Frame91 />
      <Frame92 />
    </div>
  );
}

function ContainerTitle6() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[34px] items-start justify-center min-h-px relative w-[507px]" data-name="Container title">
      <Frame41 />
      <Frame90 />
    </div>
  );
}

function Content8() {
  return (
    <div className="flex-[1_0_0] h-full min-w-px relative rounded-[8px]" data-name="Content">
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col items-start justify-center py-[20px] relative size-full">
          <ContainerTitle6 />
        </div>
      </div>
    </div>
  );
}

function Frame93() {
  return (
    <div className="bg-[#f0fdf4] h-full relative rounded-br-[8px] rounded-tr-[8px] shrink-0 w-[800px]">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start p-[46.878px] relative size-full">
          <div className="-translate-x-1/2 -translate-y-1/2 absolute h-[460px] left-[calc(50%+16.5px)] shadow-[0px_35.808px_725.116px_0px_rgba(139,139,139,0.25)] top-[calc(50%+27.07px)] w-[767px]" data-name="image 3">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img alt="" className="absolute h-[166.87%] left-[-2.69%] max-w-none top-[-20.53%] w-[177.99%]" src={imgImage6} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card6() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[24px] items-start min-h-px overflow-clip relative w-full" data-name="Card">
      <Content8 />
      <Frame93 />
    </div>
  );
}

function Frame27() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-start not-italic relative shrink-0 w-full">
      <p className="font-['Barlow_Condensed:Medium',sans-serif] leading-[38px] min-w-full relative shrink-0 text-[#181d27] text-[30px] w-[min-content]">Staff Assessment</p>
      <p className="font-['Barlow:Regular',sans-serif] leading-[24px] relative shrink-0 text-[#414651] text-[16px] w-[435px]">Evaluate potential and existing staff before assigning responsibilities by testing their practical suitability and knowledge of farm operations.</p>
    </div>
  );
}

function Frame42() {
  return (
    <div className="content-stretch flex flex-col items-start justify-end relative shrink-0 w-full">
      <Frame27 />
    </div>
  );
}

function Frame95() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-[393px]">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[411px]">Set Tests for Potential Staff to Test Their Compatibility With the Work</p>
    </div>
  );
}

function Frame96() {
  return (
    <div className="content-stretch flex gap-[7px] items-center relative shrink-0 w-full">
      <div className="bg-[#16b364] h-[12px] relative rounded-[0.3px] shrink-0 w-[4px]" />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[18px] w-[417px]">Set Knowledge Tests to Determine How Well Informed Staff Are About Farm Operations</p>
    </div>
  );
}

function Frame94() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
      <Frame95 />
      <Frame96 />
    </div>
  );
}

function ContainerTitle7() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[34px] items-start justify-center min-h-px relative w-[446px]" data-name="Container title">
      <Frame42 />
      <Frame94 />
    </div>
  );
}

function Content9() {
  return (
    <div className="flex-[1_0_0] h-full min-w-px relative rounded-[8px]" data-name="Content">
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col items-start justify-center py-[20px] relative size-full">
          <ContainerTitle7 />
        </div>
      </div>
    </div>
  );
}

function Frame97() {
  return (
    <div className="bg-[#f0fdf4] h-full relative rounded-br-[8px] rounded-tr-[8px] shrink-0 w-[800px]">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start p-[46.878px] relative size-full">
          <div className="-translate-x-1/2 -translate-y-1/2 absolute h-[460px] left-[calc(50%+16.5px)] shadow-[0px_35.808px_725.116px_0px_rgba(139,139,139,0.25)] top-[calc(50%+27.07px)] w-[767px]" data-name="image 3">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img alt="" className="absolute h-[166.87%] left-[-2.69%] max-w-none top-[-20.53%] w-[177.99%]" src={imgImage6} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card7() {
  return (
    <div className="content-stretch flex gap-[24px] h-[490px] items-start overflow-clip relative shrink-0 w-full" data-name="Card">
      <Content9 />
      <Frame97 />
    </div>
  );
}

function Frame35() {
  return (
    <div className="h-[4347px] relative shrink-0 w-full">
      <div className="content-stretch flex flex-col gap-[61px] items-start px-[60px] relative size-full">
        <Card />
        <Card1 />
        <Card2 />
        <Card3 />
        <Card4 />
        <Card5 />
        <Card6 />
        <Card7 />
      </div>
    </div>
  );
}

function Frame19() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[80px] items-start justify-center px-[24px] py-[96px] relative shrink-0 w-[1440px]">
      <Frame28 />
      <Frame35 />
    </div>
  );
}

function Tag2() {
  return (
    <div className="content-stretch flex items-center justify-center px-[12px] py-[6px] relative rounded-[8px] shrink-0" data-name="Tag">
      <div aria-hidden className="absolute border border-[#414651] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <p className="[word-break:break-word] font-['Barlow:Regular',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#414651] text-[16px] whitespace-nowrap">Testimonials</p>
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[16px] items-start min-w-px relative">
      <Tag2 />
      <p className="[word-break:break-word] font-['Barlow_Condensed:Medium',sans-serif] leading-[72px] min-w-full not-italic relative shrink-0 text-[#181d27] text-[60px] tracking-[-1.2px] w-[min-content]">The value we bring to clients.</p>
    </div>
  );
}

function Rating() {
  return (
    <div className="h-[28.493px] relative shrink-0 w-[150.466px]" data-name="Rating">
      <svg className="absolute block inset-0 size-full" fill="none" height="28.4932" preserveAspectRatio="none" viewBox="0 0 150.466 28.4932" width="150.466">
        <g id="Rating">
          <path d={svgPaths.p17c5a580} fill="#093628" id="Star 1" />
          <path d={svgPaths.p3aa6eb0} fill="#093628" id="Star 2" />
          <path d={svgPaths.p10faac80} fill="#093628" id="Star 3" />
          <path d={svgPaths.p33b12480} fill="#093628" id="Star 4" />
          <path d={svgPaths.p3465c700} fill="#093628" id="Star 5" />
        </g>
      </svg>
    </div>
  );
}

function Frame7() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full">
      <Rating />
      <div className="[word-break:break-word] flex flex-col font-['Barlow:Medium',sans-serif] justify-center leading-[0] min-w-full not-italic relative shrink-0 text-[#414651] text-[18px] w-[min-content]">
        <p className="leading-[28px]">“Our 10-day journey along the Amalfi Coast exceeded all expectations. The personalized itinerary perfectly balanced relaxation with adventure. From the intimate cooking class in Ravello to the private boat tour around Capri, every detail was meticulously planned.”</p>
      </div>
    </div>
  );
}

function Frame() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col items-start leading-[0] not-italic relative shrink-0 w-[142px]">
      <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold justify-center relative shrink-0 text-[#181d27] text-[18px] whitespace-nowrap">
        <p className="leading-[28px]">David Thompson</p>
      </div>
      <div className="flex flex-col font-['Barlow:Regular',sans-serif] justify-center min-w-full opacity-80 relative shrink-0 text-[#414651] text-[14px] w-[min-content]">
        <p className="leading-[20px]">London, UK</p>
      </div>
    </div>
  );
}

function Name() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-[225px]" data-name="NAME">
      <div className="relative shrink-0 size-[50px]" data-name="image">
        <img alt="" className="absolute block inset-0 max-w-none size-full" height="50" src={imgImage} width="50" />
      </div>
      <Frame />
    </div>
  );
}

function Frame6() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[40px] items-start px-[20px] py-[40px] relative rounded-[4px] shrink-0 w-[366px]">
      <div aria-hidden className="absolute border border-[#f5f5f5] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <Frame7 />
      <Name />
    </div>
  );
}

function Rating1() {
  return (
    <div className="h-[28.493px] relative shrink-0 w-[150.466px]" data-name="Rating">
      <svg className="absolute block inset-0 size-full" fill="none" height="28.4932" preserveAspectRatio="none" viewBox="0 0 150.466 28.4932" width="150.466">
        <g id="Rating">
          <path d={svgPaths.p17c5a580} fill="#093628" id="Star 1" />
          <path d={svgPaths.p3aa6eb0} fill="#093628" id="Star 2" />
          <path d={svgPaths.p10faac80} fill="#093628" id="Star 3" />
          <path d={svgPaths.p33b12480} fill="#093628" id="Star 4" />
          <path d={svgPaths.p3465c700} fill="#093628" id="Star 5" />
        </g>
      </svg>
    </div>
  );
}

function Frame8() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full">
      <Rating1 />
      <div className="[word-break:break-word] flex flex-col font-['Barlow:Medium',sans-serif] justify-center leading-[0] min-w-full not-italic relative shrink-0 text-[#414651] text-[18px] w-[min-content]">
        <p className="leading-[28px]">“From the moment we stepped into the Marrakech medina, we were transported into a world of enchanting sights and sounds. Our riad accommodation was a peaceful oasis amid the bustling souks. The desert camping experience in the Sahara was absolutely magical”</p>
      </div>
    </div>
  );
}

function Frame2() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col items-start leading-[0] not-italic relative shrink-0 w-[142px]">
      <div className="flex flex-col font-['Inter:Semibold',sans-serif] justify-center relative shrink-0 text-[#181d27] text-[18px] whitespace-nowrap">
        <p className="leading-[28px]">Lisa Anderson</p>
      </div>
      <div className="flex flex-col font-['Barlow:Regular',sans-serif] justify-center min-w-full opacity-80 relative shrink-0 text-[#414651] text-[14px] w-[min-content]">
        <p className="leading-[20px]">Vancouver, Canada</p>
      </div>
    </div>
  );
}

function Name1() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-[225px]" data-name="NAME">
      <div className="relative shrink-0 size-[50px]" data-name="image">
        <img alt="" className="absolute block inset-0 max-w-none size-full" height="50" src={imgImage1} width="50" />
      </div>
      <Frame2 />
    </div>
  );
}

function Frame1() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[40px] items-start px-[20px] py-[40px] relative rounded-[4px] shrink-0 w-[366px]">
      <div aria-hidden className="absolute border border-[#f5f5f5] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <Frame8 />
      <Name1 />
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex gap-[20px] items-center relative shrink-0">
      <Frame6 />
      <Frame1 />
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex gap-[80px] items-start relative shrink-0 w-full">
      <Frame3 />
      <Frame4 />
    </div>
  );
}

function Contaniner() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] items-start relative shrink-0 w-full" data-name="contaniner">
      <Frame5 />
    </div>
  );
}

function Tag3() {
  return (
    <div className="content-stretch flex items-center justify-center px-[12px] py-[6px] relative rounded-[8px] shrink-0" data-name="Tag">
      <div aria-hidden className="absolute border border-[#414651] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#414651] text-[16px] whitespace-nowrap">Pricing</p>
    </div>
  );
}

function Frame99() {
  return (
    <div className="bg-white content-stretch flex items-center justify-center px-[20px] py-[10px] relative rounded-[8px] shrink-0">
      <p className="[word-break:break-word] font-['Barlow:SemiBold',sans-serif] leading-[1.5] not-italic relative shrink-0 text-[#2f2a2a] text-[20px] whitespace-nowrap">Single Farm</p>
    </div>
  );
}

function Frame100() {
  return (
    <div className="content-stretch flex items-center justify-center px-[20px] py-[10px] relative rounded-[8px] shrink-0">
      <p className="[word-break:break-word] font-['Barlow:SemiBold',sans-serif] leading-[1.5] not-italic relative shrink-0 text-[#565656] text-[20px] whitespace-nowrap">Multiple Farms</p>
    </div>
  );
}

function Frame98() {
  return (
    <div className="bg-[#f1f5f9] content-stretch flex gap-[14px] items-center p-[8px] relative rounded-[12px] shrink-0">
      <Frame99 />
      <Frame100 />
    </div>
  );
}

function Frame102() {
  return (
    <div className="bg-white content-stretch flex items-center justify-center px-[12px] py-[10px] relative rounded-[57px] shrink-0">
      <p className="[word-break:break-word] font-['Barlow:SemiBold',sans-serif] leading-[1.5] not-italic relative shrink-0 text-[#2f2a2a] text-[16px] whitespace-nowrap">Monthly</p>
    </div>
  );
}

function Frame104() {
  return (
    <div className="bg-[#00c950] content-stretch flex items-center justify-center px-[8px] py-[2px] relative rounded-[57px] shrink-0">
      <p className="[word-break:break-word] font-['Barlow:SemiBold',sans-serif] leading-[1.5] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">Save 20%</p>
    </div>
  );
}

function Frame103() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-center px-[12px] py-[10px] relative rounded-[57px] shrink-0">
      <p className="[word-break:break-word] font-['Barlow:SemiBold',sans-serif] leading-[1.5] not-italic relative shrink-0 text-[#565656] text-[16px] whitespace-nowrap">Yearly</p>
      <Frame104 />
    </div>
  );
}

function Frame101() {
  return (
    <div className="bg-[#f1f5f9] content-stretch flex gap-[14px] items-center p-[8px] relative rounded-[45px] shrink-0">
      <Frame102 />
      <Frame103 />
    </div>
  );
}

function HeroSectionTitle() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-center justify-center relative shrink-0" data-name="Hero Section Title">
      <Tag3 />
      <p className="[word-break:break-word] font-['Barlow_Condensed:Medium',sans-serif] leading-[72px] not-italic relative shrink-0 text-[#181d27] text-[60px] text-center tracking-[-1.2px] w-[856px]">Simple, transparent pricing</p>
      <Frame98 />
      <Frame101 />
    </div>
  );
}

function Title() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col font-['Barlow_Condensed:Medium',sans-serif] gap-[2px] items-start min-w-px not-italic relative text-[20px]" data-name="Title">
      <p className="leading-[30px] relative shrink-0 text-[#181d27] w-[288px]">Starter Plan</p>
      <p className="leading-[20px] min-w-full relative shrink-0 text-[#00a63e] w-[min-content]">Up to 5 active ponds</p>
    </div>
  );
}

function Frame15() {
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full">
      <Title />
    </div>
  );
}

function Frame9() {
  return (
    <div className="content-stretch flex font-['Barlow:Regular',sans-serif] gap-[2px] items-center leading-[20px] relative shrink-0 text-[#414651] text-[14px]">
      <p className="relative shrink-0">/per user</p>
      <p className="relative shrink-0">/per month</p>
    </div>
  );
}

function Price() {
  return (
    <div className="[word-break:break-word] content-stretch flex gap-[4px] items-center not-italic relative shrink-0 whitespace-nowrap" data-name="Price">
      <p className="font-['Barlow_Condensed:Bold',sans-serif] leading-[60px] relative shrink-0 text-[#181d27] text-[48px] tracking-[-0.96px]">$49</p>
      <Frame9 />
    </div>
  );
}

function Frame10() {
  return (
    <div className="content-stretch flex items-center relative shrink-0">
      <p className="[word-break:break-word] font-['Barlow:Regular',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#414651] text-[14px] whitespace-nowrap">Perfect for small operations just getting started</p>
    </div>
  );
}

function PriceTitle() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Price+Title">
      <Frame15 />
      <Price />
      <Frame10 />
    </div>
  );
}

function IncludedFeatures() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Included Features">
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[1.8] not-italic relative shrink-0 text-[#102d23] text-[16px] tracking-[-0.2px] w-[216px]">INCLUDES:</p>
    </div>
  );
}

function Group() {
  return (
    <div className="absolute inset-[12.5%]" data-name="Group">
      <div className="absolute inset-[-5.56%]">
        <svg className="block size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
          <g id="Group">
            <path d={svgPaths.p3e1b1f00} id="Vector" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p19b92b80} id="Vector_2" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function LetsIconsCheckRingRound() {
  return (
    <div className="overflow-clip relative shrink-0 size-[24px]" data-name="lets-icons:check-ring-round">
      <Group />
    </div>
  );
}

function Benefit() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Benefit 1">
      <LetsIconsCheckRingRound />
      <p className="[word-break:break-word] font-['Barlow_Condensed:Regular',sans-serif] leading-[26px] not-italic relative shrink-0 text-[#5c6a7e] text-[16px] w-[312px]">Access to eco-learning resources</p>
    </div>
  );
}

function Group1() {
  return (
    <div className="absolute inset-[12.5%]" data-name="Group">
      <div className="absolute inset-[-5.56%]">
        <svg className="block size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
          <g id="Group">
            <path d={svgPaths.p3e1b1f00} id="Vector" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p19b92b80} id="Vector_2" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function LetsIconsCheckRingRound1() {
  return (
    <div className="overflow-clip relative shrink-0 size-[24px]" data-name="lets-icons:check-ring-round">
      <Group1 />
    </div>
  );
}

function Benefit1() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Benefit 2">
      <LetsIconsCheckRingRound1 />
      <p className="[word-break:break-word] font-['Barlow_Condensed:Regular',sans-serif] leading-[26px] not-italic relative shrink-0 text-[#5c6a7e] text-[16px] w-[312px]">Access to eco-learning resources</p>
    </div>
  );
}

function Group2() {
  return (
    <div className="absolute inset-[12.5%]" data-name="Group">
      <div className="absolute inset-[-5.56%]">
        <svg className="block size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
          <g id="Group">
            <path d={svgPaths.p3e1b1f00} id="Vector" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p19b92b80} id="Vector_2" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function LetsIconsCheckRingRound2() {
  return (
    <div className="overflow-clip relative shrink-0 size-[24px]" data-name="lets-icons:check-ring-round">
      <Group2 />
    </div>
  );
}

function Benefit2() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Benefit 3">
      <LetsIconsCheckRingRound2 />
      <p className="[word-break:break-word] font-['Barlow_Condensed:Regular',sans-serif] leading-[26px] not-italic relative shrink-0 text-[#5c6a7e] text-[16px] w-[312px]">Access to eco-learning resources</p>
    </div>
  );
}

function Group3() {
  return (
    <div className="absolute inset-[12.5%]" data-name="Group">
      <div className="absolute inset-[-5.56%]">
        <svg className="block size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
          <g id="Group">
            <path d={svgPaths.p3e1b1f00} id="Vector" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p19b92b80} id="Vector_2" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function LetsIconsCheckRingRound3() {
  return (
    <div className="overflow-clip relative shrink-0 size-[24px]" data-name="lets-icons:check-ring-round">
      <Group3 />
    </div>
  );
}

function Benefit3() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Benefit 4">
      <LetsIconsCheckRingRound3 />
      <p className="[word-break:break-word] font-['Barlow_Condensed:Regular',sans-serif] leading-[26px] not-italic relative shrink-0 text-[#5c6a7e] text-[16px] w-[312px]">Access to eco-learning resources</p>
    </div>
  );
}

function Group4() {
  return (
    <div className="absolute inset-[12.5%]" data-name="Group">
      <div className="absolute inset-[-5.56%]">
        <svg className="block size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
          <g id="Group">
            <path d={svgPaths.p3e1b1f00} id="Vector" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p19b92b80} id="Vector_2" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function LetsIconsCheckRingRound4() {
  return (
    <div className="overflow-clip relative shrink-0 size-[24px]" data-name="lets-icons:check-ring-round">
      <Group4 />
    </div>
  );
}

function Benefit4() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Benefit 5">
      <LetsIconsCheckRingRound4 />
      <p className="[word-break:break-word] font-['Barlow_Condensed:Regular',sans-serif] leading-[26px] not-italic relative shrink-0 text-[#5c6a7e] text-[16px] w-[312px]">Access to eco-learning resources</p>
    </div>
  );
}

function BenefitList() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="Benefit List">
      <Benefit />
      <Benefit1 />
      <Benefit2 />
      <Benefit3 />
      <Benefit4 />
    </div>
  );
}

function Features() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0" data-name="Features">
      <IncludedFeatures />
      <BenefitList />
    </div>
  );
}

function PriceCard() {
  return (
    <div className="bg-white flex-[1_0_0] min-w-px relative rounded-[20px]" data-name="Price Card">
      <div aria-hidden className="absolute border border-[#bbb] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[24px] relative size-full">
        <PriceTitle />
        <Features />
        <div className="backdrop-blur-[8px] relative rounded-[12px] shrink-0 w-full" data-name="Secondary Action">
          <div aria-hidden className="absolute border border-[#a6a6a6] border-solid inset-[-1px] pointer-events-none rounded-[13px]" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex items-center justify-center px-[20px] py-[12px] relative size-full">
              <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[1.5] not-italic relative shrink-0 text-[16px] text-black whitespace-nowrap">Try Free for 30 Days</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Title1() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col font-['Barlow_Condensed:Medium',sans-serif] gap-[2px] items-start min-w-px not-italic relative text-[20px]" data-name="Title">
      <p className="leading-[30px] relative shrink-0 text-[#181d27] w-[288px]">Starter Plan</p>
      <p className="leading-[20px] min-w-full relative shrink-0 text-[#73e2a3] w-[min-content]">Up to 5 active ponds</p>
    </div>
  );
}

function Frame16() {
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full">
      <Title1 />
    </div>
  );
}

function Frame11() {
  return (
    <div className="content-stretch flex font-['Barlow:Regular',sans-serif] gap-[2px] items-center leading-[20px] relative shrink-0 text-[#414651] text-[14px]">
      <p className="relative shrink-0">/per user</p>
      <p className="relative shrink-0">/per month</p>
    </div>
  );
}

function Price1() {
  return (
    <div className="[word-break:break-word] content-stretch flex gap-[4px] items-center not-italic relative shrink-0 whitespace-nowrap" data-name="Price">
      <p className="font-['Barlow_Condensed:Bold',sans-serif] leading-[60px] relative shrink-0 text-[#181d27] text-[48px] tracking-[-0.96px]">$49</p>
      <Frame11 />
    </div>
  );
}

function Frame12() {
  return (
    <div className="content-stretch flex items-center relative shrink-0">
      <p className="[word-break:break-word] font-['Barlow:Regular',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#414651] text-[14px] whitespace-nowrap">Perfect for small operations just getting started</p>
    </div>
  );
}

function PriceTitle1() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Price+Title">
      <Frame16 />
      <Price1 />
      <Frame12 />
    </div>
  );
}

function IncludedFeatures1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Included Features">
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[1.8] not-italic relative shrink-0 text-[#102d23] text-[16px] tracking-[-0.2px] w-[216px]">INCLUDES:</p>
    </div>
  );
}

function Group5() {
  return (
    <div className="absolute inset-[12.5%]" data-name="Group">
      <div className="absolute inset-[-5.56%]">
        <svg className="block size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
          <g id="Group">
            <path d={svgPaths.p3e1b1f00} id="Vector" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p19b92b80} id="Vector_2" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function LetsIconsCheckRingRound5() {
  return (
    <div className="overflow-clip relative shrink-0 size-[24px]" data-name="lets-icons:check-ring-round">
      <Group5 />
    </div>
  );
}

function Benefit5() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Benefit 1">
      <LetsIconsCheckRingRound5 />
      <p className="[word-break:break-word] font-['Barlow_Condensed:Regular',sans-serif] leading-[26px] not-italic relative shrink-0 text-[#5c6a7e] text-[16px] w-[312px]">Access to eco-learning resources</p>
    </div>
  );
}

function Group6() {
  return (
    <div className="absolute inset-[12.5%]" data-name="Group">
      <div className="absolute inset-[-5.56%]">
        <svg className="block size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
          <g id="Group">
            <path d={svgPaths.p3e1b1f00} id="Vector" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p19b92b80} id="Vector_2" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function LetsIconsCheckRingRound6() {
  return (
    <div className="overflow-clip relative shrink-0 size-[24px]" data-name="lets-icons:check-ring-round">
      <Group6 />
    </div>
  );
}

function Benefit6() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Benefit 2">
      <LetsIconsCheckRingRound6 />
      <p className="[word-break:break-word] font-['Barlow_Condensed:Regular',sans-serif] leading-[26px] not-italic relative shrink-0 text-[#5c6a7e] text-[16px] w-[312px]">Access to eco-learning resources</p>
    </div>
  );
}

function Group7() {
  return (
    <div className="absolute inset-[12.5%]" data-name="Group">
      <div className="absolute inset-[-5.56%]">
        <svg className="block size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
          <g id="Group">
            <path d={svgPaths.p3e1b1f00} id="Vector" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p19b92b80} id="Vector_2" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function LetsIconsCheckRingRound7() {
  return (
    <div className="overflow-clip relative shrink-0 size-[24px]" data-name="lets-icons:check-ring-round">
      <Group7 />
    </div>
  );
}

function Benefit7() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Benefit 3">
      <LetsIconsCheckRingRound7 />
      <p className="[word-break:break-word] font-['Barlow_Condensed:Regular',sans-serif] leading-[26px] not-italic relative shrink-0 text-[#5c6a7e] text-[16px] w-[312px]">Access to eco-learning resources</p>
    </div>
  );
}

function Group8() {
  return (
    <div className="absolute inset-[12.5%]" data-name="Group">
      <div className="absolute inset-[-5.56%]">
        <svg className="block size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
          <g id="Group">
            <path d={svgPaths.p3e1b1f00} id="Vector" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p19b92b80} id="Vector_2" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function LetsIconsCheckRingRound8() {
  return (
    <div className="overflow-clip relative shrink-0 size-[24px]" data-name="lets-icons:check-ring-round">
      <Group8 />
    </div>
  );
}

function Benefit8() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Benefit 4">
      <LetsIconsCheckRingRound8 />
      <p className="[word-break:break-word] font-['Barlow_Condensed:Regular',sans-serif] leading-[26px] not-italic relative shrink-0 text-[#5c6a7e] text-[16px] w-[312px]">Access to eco-learning resources</p>
    </div>
  );
}

function Group9() {
  return (
    <div className="absolute inset-[12.5%]" data-name="Group">
      <div className="absolute inset-[-5.56%]">
        <svg className="block size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
          <g id="Group">
            <path d={svgPaths.p3e1b1f00} id="Vector" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p19b92b80} id="Vector_2" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function LetsIconsCheckRingRound9() {
  return (
    <div className="overflow-clip relative shrink-0 size-[24px]" data-name="lets-icons:check-ring-round">
      <Group9 />
    </div>
  );
}

function Benefit9() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Benefit 5">
      <LetsIconsCheckRingRound9 />
      <p className="[word-break:break-word] font-['Barlow_Condensed:Regular',sans-serif] leading-[26px] not-italic relative shrink-0 text-[#5c6a7e] text-[16px] w-[312px]">Access to eco-learning resources</p>
    </div>
  );
}

function BenefitList1() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="Benefit List">
      <Benefit5 />
      <Benefit6 />
      <Benefit7 />
      <Benefit8 />
      <Benefit9 />
    </div>
  );
}

function Features1() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0" data-name="Features">
      <IncludedFeatures1 />
      <BenefitList1 />
    </div>
  );
}

function PriceCard1() {
  return (
    <div className="bg-white flex-[1_0_0] min-w-px relative rounded-[20px]" data-name="Price Card">
      <div aria-hidden className="absolute border-3 border-[#73e2a3] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[24px] relative size-full">
        <PriceTitle1 />
        <Features1 />
        <div className="backdrop-blur-[8px] bg-[#73e2a3] relative rounded-[12px] shrink-0 w-full" data-name="Secondary Action">
          <div aria-hidden className="absolute border border-[#73e2a3] border-solid inset-[-1px] pointer-events-none rounded-[13px]" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex items-center justify-center px-[20px] py-[12px] relative size-full">
              <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[1.5] not-italic relative shrink-0 text-[16px] text-black whitespace-nowrap">Try Free for 30 Days</p>
            </div>
          </div>
        </div>
        <div className="-translate-x-1/2 absolute backdrop-blur-[8px] bg-[#73e2a3] h-[26px] left-[calc(50%-0.83px)] rounded-[12px] top-[-9px] w-[101px]" data-name="Secondary Action">
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex items-center justify-center px-[20px] py-[12px] relative size-full">
              <p className="[word-break:break-word] font-['Barlow:SemiBold',sans-serif] leading-[1.5] not-italic relative shrink-0 text-[#242424] text-[16px] whitespace-nowrap">Popular</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Title2() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col font-['Barlow_Condensed:Medium',sans-serif] gap-[2px] items-start min-w-px not-italic relative text-[20px]" data-name="Title">
      <p className="leading-[30px] relative shrink-0 text-[#181d27] w-[288px]">Starter Plan</p>
      <p className="leading-[20px] min-w-full relative shrink-0 text-[#6e6e6e] w-[min-content]">Up to 5 active ponds</p>
    </div>
  );
}

function Frame17() {
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full">
      <Title2 />
    </div>
  );
}

function Frame13() {
  return (
    <div className="content-stretch flex font-['Barlow:Regular',sans-serif] gap-[2px] items-center leading-[20px] relative shrink-0 text-[#414651] text-[14px]">
      <p className="relative shrink-0">/per user</p>
      <p className="relative shrink-0">/per month</p>
    </div>
  );
}

function Price2() {
  return (
    <div className="[word-break:break-word] content-stretch flex gap-[4px] items-center not-italic relative shrink-0 whitespace-nowrap" data-name="Price">
      <p className="font-['Barlow_Condensed:Bold',sans-serif] leading-[60px] relative shrink-0 text-[#181d27] text-[48px] tracking-[-0.96px]">$49</p>
      <Frame13 />
    </div>
  );
}

function Frame14() {
  return (
    <div className="content-stretch flex items-center relative shrink-0">
      <p className="[word-break:break-word] font-['Barlow:Regular',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#414651] text-[14px] whitespace-nowrap">Perfect for small operations just getting started</p>
    </div>
  );
}

function PriceTitle2() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Price+Title">
      <Frame17 />
      <Price2 />
      <Frame14 />
    </div>
  );
}

function IncludedFeatures2() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Included Features">
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[1.8] not-italic relative shrink-0 text-[#102d23] text-[16px] tracking-[-0.2px] w-[216px]">INCLUDES:</p>
    </div>
  );
}

function Group10() {
  return (
    <div className="absolute inset-[12.5%]" data-name="Group">
      <div className="absolute inset-[-5.56%]">
        <svg className="block size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
          <g id="Group">
            <path d={svgPaths.p3e1b1f00} id="Vector" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p19b92b80} id="Vector_2" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function LetsIconsCheckRingRound10() {
  return (
    <div className="overflow-clip relative shrink-0 size-[24px]" data-name="lets-icons:check-ring-round">
      <Group10 />
    </div>
  );
}

function Benefit10() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Benefit 1">
      <LetsIconsCheckRingRound10 />
      <p className="[word-break:break-word] font-['Barlow_Condensed:Regular',sans-serif] leading-[26px] not-italic relative shrink-0 text-[#5c6a7e] text-[16px] w-[312px]">Access to eco-learning resources</p>
    </div>
  );
}

function Group11() {
  return (
    <div className="absolute inset-[12.5%]" data-name="Group">
      <div className="absolute inset-[-5.56%]">
        <svg className="block size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
          <g id="Group">
            <path d={svgPaths.p3e1b1f00} id="Vector" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p19b92b80} id="Vector_2" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function LetsIconsCheckRingRound11() {
  return (
    <div className="overflow-clip relative shrink-0 size-[24px]" data-name="lets-icons:check-ring-round">
      <Group11 />
    </div>
  );
}

function Benefit11() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Benefit 2">
      <LetsIconsCheckRingRound11 />
      <p className="[word-break:break-word] font-['Barlow_Condensed:Regular',sans-serif] leading-[26px] not-italic relative shrink-0 text-[#5c6a7e] text-[16px] w-[312px]">Access to eco-learning resources</p>
    </div>
  );
}

function Group12() {
  return (
    <div className="absolute inset-[12.5%]" data-name="Group">
      <div className="absolute inset-[-5.56%]">
        <svg className="block size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
          <g id="Group">
            <path d={svgPaths.p3e1b1f00} id="Vector" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p19b92b80} id="Vector_2" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function LetsIconsCheckRingRound12() {
  return (
    <div className="overflow-clip relative shrink-0 size-[24px]" data-name="lets-icons:check-ring-round">
      <Group12 />
    </div>
  );
}

function Benefit12() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Benefit 3">
      <LetsIconsCheckRingRound12 />
      <p className="[word-break:break-word] font-['Barlow_Condensed:Regular',sans-serif] leading-[26px] not-italic relative shrink-0 text-[#5c6a7e] text-[16px] w-[312px]">Access to eco-learning resources</p>
    </div>
  );
}

function Group13() {
  return (
    <div className="absolute inset-[12.5%]" data-name="Group">
      <div className="absolute inset-[-5.56%]">
        <svg className="block size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
          <g id="Group">
            <path d={svgPaths.p3e1b1f00} id="Vector" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p19b92b80} id="Vector_2" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function LetsIconsCheckRingRound13() {
  return (
    <div className="overflow-clip relative shrink-0 size-[24px]" data-name="lets-icons:check-ring-round">
      <Group13 />
    </div>
  );
}

function Benefit13() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Benefit 4">
      <LetsIconsCheckRingRound13 />
      <p className="[word-break:break-word] font-['Barlow_Condensed:Regular',sans-serif] leading-[26px] not-italic relative shrink-0 text-[#5c6a7e] text-[16px] w-[312px]">Access to eco-learning resources</p>
    </div>
  );
}

function Group14() {
  return (
    <div className="absolute inset-[12.5%]" data-name="Group">
      <div className="absolute inset-[-5.56%]">
        <svg className="block size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
          <g id="Group">
            <path d={svgPaths.p3e1b1f00} id="Vector" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p19b92b80} id="Vector_2" stroke="#16B364" strokeLinecap="round" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function LetsIconsCheckRingRound14() {
  return (
    <div className="overflow-clip relative shrink-0 size-[24px]" data-name="lets-icons:check-ring-round">
      <Group14 />
    </div>
  );
}

function Benefit14() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Benefit 5">
      <LetsIconsCheckRingRound14 />
      <p className="[word-break:break-word] font-['Barlow_Condensed:Regular',sans-serif] leading-[26px] not-italic relative shrink-0 text-[#5c6a7e] text-[16px] w-[312px]">Access to eco-learning resources</p>
    </div>
  );
}

function BenefitList2() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="Benefit List">
      <Benefit10 />
      <Benefit11 />
      <Benefit12 />
      <Benefit13 />
      <Benefit14 />
    </div>
  );
}

function Features2() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0" data-name="Features">
      <IncludedFeatures2 />
      <BenefitList2 />
    </div>
  );
}

function PriceCard2() {
  return (
    <div className="bg-white flex-[1_0_0] min-w-px relative rounded-[20px]" data-name="Price Card">
      <div aria-hidden className="absolute border-3 border-[#00a63e] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[24px] relative size-full">
        <PriceTitle2 />
        <Features2 />
        <div className="backdrop-blur-[8px] bg-[#00a63e] relative rounded-[12px] shrink-0 w-full" data-name="Secondary Action">
          <div aria-hidden className="absolute border border-[#00a63e] border-solid inset-[-1px] pointer-events-none rounded-[13px]" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex items-center justify-center px-[20px] py-[12px] relative size-full">
              <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[1.5] not-italic relative shrink-0 text-[16px] text-white whitespace-nowrap">Try Free for 30 Days</p>
            </div>
          </div>
        </div>
        <div className="-translate-x-1/2 absolute backdrop-blur-[8px] bg-[#00a63e] h-[26px] left-[calc(50%-0.83px)] rounded-[12px] top-[-10px] w-[111px]" data-name="Secondary Action">
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex items-center justify-center px-[20px] py-[12px] relative size-full">
              <p className="[word-break:break-word] font-['Barlow:SemiBold',sans-serif] leading-[1.5] not-italic relative shrink-0 text-[16px] text-white whitespace-nowrap">Best Value</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceContainer() {
  return (
    <div className="content-stretch flex gap-[32px] items-center relative shrink-0 w-[1224px]" data-name="Price Container">
      <PriceCard />
      <PriceCard1 />
      <PriceCard2 />
    </div>
  );
}

function Pricing() {
  return (
    <div className="content-stretch flex flex-col gap-[80px] items-center overflow-clip px-[24px] py-[96px] relative shrink-0 w-full" data-name="Pricing">
      <HeroSectionTitle />
      <PriceContainer />
    </div>
  );
}

function Overlay() {
  return <div className="absolute bg-[#000102] h-[586px] left-0 opacity-50 rounded-[4px] top-[-0.49px] w-[1392px]" data-name="overlay" />;
}

function Heading() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Heading">
      <p className="[word-break:break-word] font-['Barlow_Condensed:SemiBold',sans-serif] leading-[72px] not-italic relative shrink-0 text-[60px] text-white tracking-[-1.2px] w-full">Ready to Build a More Sustainable Future?</p>
    </div>
  );
}

function Content10() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] items-start justify-center relative shrink-0 w-full" data-name="Content">
      <Heading />
      <p className="[word-break:break-word] font-['Barlow:Medium',sans-serif] leading-[30px] not-italic relative shrink-0 text-[20px] text-white w-full">Collaborate with sustainability experts to cut emissions, embrace clean energy, and achieve measurable environmental impact with smart, data-driven solutions.</p>
    </div>
  );
}

function Actions1() {
  return (
    <div className="content-stretch flex gap-[16px] items-start relative shrink-0" data-name="Actions">
      <div className="bg-white relative rounded-[9999px] shrink-0" data-name="Primary Action">
        <div className="flex flex-row items-center justify-center size-full">
          <div className="content-stretch flex items-center justify-center px-[20px] py-[12px] relative size-full">
            <p className="[word-break:break-word] font-['Barlow:Regular',sans-serif] leading-[1.5] not-italic relative shrink-0 text-[#414651] text-[16px] whitespace-nowrap">Get in touch</p>
          </div>
        </div>
      </div>
      <div className="backdrop-blur-[8px] bg-[rgba(255,253,246,0.16)] relative rounded-[9999px] shrink-0" data-name="Secondary Action">
        <div aria-hidden className="absolute border border-[rgba(255,253,246,0.32)] border-solid inset-[-1px] pointer-events-none rounded-[10000px]" />
        <div className="flex flex-row items-center justify-center size-full">
          <div className="content-stretch flex items-center justify-center px-[20px] py-[12px] relative size-full">
            <p className="[word-break:break-word] font-['Barlow:Regular',sans-serif] leading-[1.5] not-italic relative shrink-0 text-[16px] text-white whitespace-nowrap">{`Browse services `}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Actions() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start pt-[16px] relative shrink-0 w-full" data-name="Actions">
      <Actions1 />
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[0] min-w-full not-italic relative shrink-0 text-[0px] text-white tracking-[0.4px] w-[min-content]">
        <span className="font-['Barlow:Regular',sans-serif] leading-[1.5] text-[16px]">{`By clicking Sign Up you're confirming that you agree with our `}</span>
        <span className="font-['Barlow:Regular',sans-serif] leading-[1.5] text-[16px]">Terms and Conditions</span>
        <span className="font-['Barlow:Regular',sans-serif] leading-[1.5] text-[16px]">.</span>
      </p>
    </div>
  );
}

function Column2() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-[640px]" data-name="Column">
      <Content10 />
      <Actions />
    </div>
  );
}

function Cta1() {
  return (
    <div className="relative rounded-[16px] shrink-0 w-full" data-name="CTA">
      <div className="flex flex-col justify-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[80px] items-start justify-center px-[64px] py-[96px] relative size-full">
          <Overlay />
          <Column2 />
        </div>
      </div>
    </div>
  );
}

function Cta() {
  return (
    <div className="content-stretch flex flex-col items-start px-[24px] py-[112px] relative shrink-0 w-full" data-name="Cta">
      <Cta1 />
    </div>
  );
}

function Frame32() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full">
      <p className="[word-break:break-word] font-['Urbanist:Regular',sans-serif] font-normal leading-[1.6] relative shrink-0 text-[16px] text-white w-full">Your information is never disclosed to third parties.</p>
    </div>
  );
}

function LogoAndSupportingText() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] items-start relative shrink-0 w-[350px]" data-name="Logo and supporting text">
      <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[34.51px] not-italic relative shrink-0 text-[28.235px] text-white tracking-[-0.5647px] w-full">Stay Informed on Clean Energy and Sustainability</p>
      <Frame32 />
    </div>
  );
}

function IndexLinksList() {
  return (
    <div className="content-stretch flex flex-col font-['Inter:Regular',sans-serif] font-normal gap-[8px] items-start relative shrink-0 w-full" data-name="Index Links List">
      <p className="relative shrink-0 w-full">Home</p>
      <p className="relative shrink-0 w-full">About</p>
      <p className="relative shrink-0 w-full">Pricing</p>
      <p className="relative shrink-0 w-full">Pricing single (cms)</p>
      <p className="relative shrink-0 w-full">{`Contact `}</p>
    </div>
  );
}

function IndexLinks() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[16px] items-start min-w-px relative" data-name="Index Links">
      <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 whitespace-nowrap">MAIN SECTIONS</p>
      <IndexLinksList />
    </div>
  );
}

function CompanyPagesLinksList() {
  return (
    <div className="content-stretch flex flex-col font-['Inter:Regular',sans-serif] font-normal gap-[8px] items-start relative shrink-0 w-full" data-name="Company Pages Links List">
      <p className="relative shrink-0 w-full">Services</p>
      <p className="relative shrink-0 w-full">Blog</p>
      <p className="relative shrink-0 w-full">Blog single (cms)</p>
      <p className="relative shrink-0 w-full">FAQ</p>
    </div>
  );
}

function CompanyPagesLinks() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[16px] items-start min-w-px relative" data-name="Company Pages Links">
      <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 whitespace-nowrap">OTHER PAGES</p>
      <CompanyPagesLinksList />
    </div>
  );
}

function SinglePageLinksList() {
  return (
    <div className="content-stretch flex flex-col font-['Inter:Regular',sans-serif] font-normal gap-[8px] items-start relative shrink-0" data-name="Single Page Links List">
      <p className="relative shrink-0 w-full">Style Guide</p>
      <p className="relative shrink-0 w-full">Licenses</p>
      <p className="relative shrink-0 w-full">Privacy Policy</p>
    </div>
  );
}

function SinglePageLinks() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start justify-center relative shrink-0" data-name="Single Page Links">
      <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 whitespace-nowrap">TEMPLATE</p>
      <SinglePageLinksList />
    </div>
  );
}

function LinksSection() {
  return (
    <div className="[word-break:break-word] content-stretch flex gap-[32px] items-start leading-[24px] not-italic relative shrink-0 text-[16px] text-white w-[724px]" data-name="Links Section">
      <IndexLinks />
      <CompanyPagesLinks />
      <SinglePageLinks />
    </div>
  );
}

function FooterLinksContainer() {
  return (
    <div className="content-stretch flex items-start justify-between pb-[32px] relative shrink-0 w-full" data-name="Footer Links Container">
      <LogoAndSupportingText />
      <LinksSection />
    </div>
  );
}

function Container2() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="container">
      <FooterLinksContainer />
    </div>
  );
}

function Container1() {
  return (
    <div className="content-stretch flex flex-col gap-[80px] items-start relative shrink-0 w-full" data-name="Container">
      <Container2 />
    </div>
  );
}

function Footer() {
  return (
    <div className="content-stretch flex flex-col items-center overflow-clip relative shrink-0 w-full" data-name="Footer / 5 /">
      <Container1 />
    </div>
  );
}

function Icons() {
  return (
    <div className="[word-break:break-word] absolute content-stretch flex font-['Font_Awesome_6_Brands:Regular',sans-serif] gap-[16px] items-center leading-none not-italic right-[70px] text-[14px] text-right text-white top-[25px] uppercase whitespace-nowrap" data-name="icons">
      <p className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] opacity-40 relative shrink-0">facebook-f</p>
      <p className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] relative shrink-0">x-twitter</p>
      <p className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] opacity-40 relative shrink-0">behance</p>
      <p className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] opacity-40 relative shrink-0">linkedin</p>
    </div>
  );
}

function Frame43() {
  return (
    <div className="absolute h-[60px] left-[24px] top-[611.51px] w-[1449px]">
      <div className="absolute bg-[#181d27] h-[60px] left-[-24px] top-0 w-[1444px]" data-name="bg" />
      <p className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] [word-break:break-word] absolute font-['Inter:Regular',sans-serif] font-normal leading-none left-0 not-italic text-[#beb5ad] text-[14px] top-[25px] uppercase whitespace-nowrap">© 2026 AirCo designed with love by Airdokan Proword by Webflow. All Rights Reserved.</p>
      <Icons />
    </div>
  );
}

export default function Frame60() {
  return (
    <div className="bg-white content-stretch flex flex-col items-start relative size-full">
      <Frame56 />
      <Frame55 />
      <Frame19 />
      <div className="relative shrink-0 w-full" data-name="Testimonial">
        <div className="overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex flex-col items-start px-[60px] py-[96px] relative size-full">
            <Contaniner />
          </div>
        </div>
      </div>
      <Pricing />
      <Cta />
      <div className="bg-[#181d27] relative shrink-0 w-full" data-name="Nav">
        <div className="overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex flex-col gap-[80px] items-start px-[60px] py-[96px] relative size-full">
            <Footer />
            <Frame43 />
          </div>
        </div>
      </div>
    </div>
  );
}