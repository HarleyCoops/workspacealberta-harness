/** AESO-shaped CSD + price text used by parser and view specs. */

export const CSD_FIXTURE = `Current Supply Demand Report

"Last Update : Sep 02, 2026 08:05"

"Alberta Total Net Generation","10425"
"Net Actual Interchange","71"
"Alberta Internal Load (AIL)","10354"

"COGENERATION","6122","4193","0"
"WIND","5684","1621","0"
"COMBINED CYCLE","3974","2971","0"
"GAS FIRED STEAM","3078","712","35"
"SOLAR","1892","290","0"
"SIMPLE CYCLE","1014","149","0"
"HYDRO","896","259","304"
"OTHER","485","230","0"
"ENERGY STORAGE","270","0","120"
"TOTAL","23415","10425","459"

"British Columbia","68"
"Montana","-19"
"Saskatchewan","22"
"TOTAL","71"

"<center><b>Simple Cycle</b></center>"
"ASSET","MC","TNG","DCR"
"Cloverbar #1 (ENC1)","48","0","0"
`

export const PRICE_FIXTURE = `Pool Price

""

Date (HE),Price ($),30Ravg ($),AIL Demand (MW)
"09/02/2026 09","-","-","-"
"09/02/2026 08","-","-","10297.0"
"09/02/2026 07","13.90","50.08","9914.0"
"09/02/2026 06","9.71","50.07","9540.0"
`

export const PRICE_EMPTY = `Pool Price

Date (HE),Price ($),30Ravg ($),AIL Demand (MW)
"09/02/2026 09","-","-","-"
`
