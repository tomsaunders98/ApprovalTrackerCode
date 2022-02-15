import pandas as pd
import re
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import numpy as np
from datetime import datetime
import logging



logging.basicConfig(filename="output.log",
                            filemode='a',
                            format='Poll Model: %(asctime)s, %(name)s %(levelname)s %(message)s',
                            datefmt='%H:%M:%S',
                            level=logging.INFO)


def conv_perc(x):
    xv = x
    if "%" in str(xv):
        xv = int(re.sub("[^\d+]+", "", xv))/100
        val = xv
    elif str(xv) == "?":
        val = np.nan
    else:
        val = x
    return val


def date_col(x, i):
    try:
        datestring = re.findall("(\d+)", str(x))
        mlist = re.findall("([a-zA-z]+)", x)
        if len(mlist) > 1:
            if i == 1:
                month = mlist[0]
            if i == 2:
                month = mlist[-1]
        if len(mlist) == 1:
            month = mlist[0]
        if i == 1:
            date = datestring[0]
        if i == 2 and len(datestring) == 1:
            date = datestring[0]
        if i == 2 and len(datestring) > 1:
            date = datestring[1]
        ds = str(date) + "_" + month + "_2022"
        ds_f = datetime.strptime(ds, "%d_%b_%Y")
        return(f"{ds_f.day}/{ds_f.month}/{ds_f.year}")
    except:
        return np.nan


def cycle_table(table):
    #Initiate table
    constructeddf = pd.read_html(table.get_attribute("outerHTML"), header=0, skiprows=[1])[0]

    #constructeddf = constructeddf.drop(index=1)
    #Create Columns
    constructeddf["Crosstab"] = np.nan
    constructeddf["url"] = np.nan

    #Compile Regex
    ftype = re.compile("((\.pdf)|(\.xlsx))$", re.MULTILINE)
    perc_re = re.compile("(?<=%)(.*?)(?=%)", re.DOTALL)
    split = re.compile("(.+(?=on))|(\d+)")

    #Find Rows
    rows = table.find_elements_by_xpath(".//tr")

    #Other
    rowindex = 0

    #Cycler
    for row in rows:
        cells = row.find_elements_by_xpath(".//td")

        if len(cells) != 9:
            if rowindex != 0:
                rowindex += 1
            continue
        i = 1
        for cell in cells:
            if (i == 2):
                url = cell.find_element_by_xpath(".//a").get_attribute("href")
                constructeddf.loc[rowindex, ["url"]] = str(url)
                crosstab = re.search(ftype, url)
                if crosstab != None:
                    constructeddf.loc[rowindex, ["Crosstab"]] = "Crosstab"
            i += 1
        rowindex += 1
    return constructeddf


if __name__ == "__main__":

    print("Scraping polls...")
    logging.info("Scrapping polls")
    #Set Chrome Options
    opts = Options()
    opts.add_argument("--disable-extensions")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--headless")
    opts.BinaryLocation = "/usr/bin/chromium-browser"

    #driver = webdriver.Chrome("../chromedriver.exe", options=opts)
    #Initiate Chrome
    driver = webdriver.Chrome(options=opts)
    # Once Chrome is started, ensure closure on error
    try:
        # Get table
        driver.get("https://en.wikipedia.org/wiki/Leadership_approval_opinion_polling_for_the_next_United_Kingdom_general_election")

        boris = driver.find_element_by_xpath("//h3[contains(.,'Boris Johnson')]/following::table")

        keir = driver.find_element_by_xpath("//h3[contains(.,'Keir Starmer')]/following::table")
        #Cycle
        boris = cycle_table(boris)
        keir = cycle_table(keir)
        driver.quit()


    except Exception as e:
        print(e)
        driver.quit()
    logging.info("Polls collected")


    ##Merge sheets into single massive approval datasheet
    keir["person"] = "Keir"
    boris["person"] = "Boris"
    result = pd.concat([keir, boris])

    old_cols = list(result.columns)
    print(old_cols)
    # #Convert dateranges + percentages
    result["StartDate"] = result.apply(lambda x: date_col(x["hideDate(s)conducted"], 1), axis=1)
    result["EndDate"] = result.apply(lambda x: date_col(x["hideDate(s)conducted"], 2), axis=1)
    result = result.applymap(conv_perc)

    ##Final Cosmetic touches
    new_cols = ["StartDate", "EndDate"] + old_cols
    result = result[new_cols]
    result = result.drop(["hideDate(s)conducted"], axis=1)

    old_polls = pd.read_csv("polls_approval_old.csv")
    all_polls = pd.concat([result, old_polls])


    logging.info("Polls wranged, saving...")
    #Push polls
    all_polls.to_csv(f"polls_approval.csv", index=False)
    print("Polls Built")
