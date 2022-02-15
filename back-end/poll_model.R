library(magrittr)
library(stats)
library(dplyr)
library(tidyr)
library(lubridate)

model <- read.csv("polls_approval.csv") %>%
  mutate(
    start = as.Date(StartDate, format="%d/%m/%Y"),
    end = as.Date(EndDate, format="%d/%m/%Y"),
    midpoint = (end - (1 + as.numeric(end-start)) %/% 2)
    ) %>%
  select(
    date = midpoint,
    sample = Sample.size,
    wording = Questionwording,
    approve = Approve,
    disprove = Disapprove,
    person
  ) %>%
  drop_na(approve, disprove, person, date) %>%
  filter(wording != "Well/Badly") %>%
  group_by(person, date) %>%
  summarise(
    sample = mean(sample, na.rm = T),
    approve = mean(approve, na.rm = T),
    disprove = mean(disprove, na.rm = T)
  ) %>%
  mutate(
    date_index = 1 + as.numeric(date) - min(as.numeric(date))
  )



polls_fin <- read.csv("polls_approval.csv", na.strings = "") %>%
  rename(
    Pollster = Pollster.client,
    Sample = Sample.size,
    Question = Questionwording,
    `Don't know` = Don.t.know,
    `Net approval` = Net.approval
  )

write.csv(polls_fin, "polls.csv", row.names = F)

## Keir Starmer

model_k <- model %>%
  filter(person == "Keir")
  


keir_lo_app <- loess(approve ~ date_index, model_k, span = 0.5)
keir_lo_dis <- loess(disprove ~ date_index, model_k, span = 0.5)

preds_approve <- predict(keir_lo_app, se = T)
preds_disprove <- predict(keir_lo_dis, se = T)

model_k$approve_est <- preds_approve$fit
model_k$approve_lower <- preds_approve$fit - qt(0.95,preds_approve$df)*preds_approve$se
model_k$approve_upper <- preds_approve$fit + qt(0.95,preds_approve$df)*preds_approve$se

model_k$disprove_est <- preds_disprove$fit
model_k$disprove_lower <- preds_disprove$fit - qt(0.95,preds_disapprove$df)*preds_disapprove$se
model_k$disprove_upper <- preds_disprove$fit + qt(0.95,preds_disprove$df)*preds_disprove$se




all_dates <- seq(min(model_k$date, na.rm = T), max(model_k$date, na.rm = T), by="days")
missing_dates <- setdiff(all_dates, model_k$date)

model_sole <- model_k %>%
  select(c(approve_est, disprove_est, approve_lower,disprove_lower, approve_upper, disprove_upper, date)) %>%
  pivot_longer(c(approve_est, disprove_est, approve_lower,disprove_lower, approve_upper, disprove_upper), names_to="type", values_to="model") %>%
  mutate(
    m_type = stringr::str_extract(type, "(?<=_).+"),
    type = stringr::str_extract(type, ".+(?=_)")
  ) %>%
  group_by(type, m_type) %>%
  summarise(
    model = approx(x=date, y=model, xout = missing_dates)$y,
    date = missing_dates,
  ) %>%
  mutate(
    date = as.Date(date,origin="1970-01-01")
  )

model_k <- model_k %>%
  pivot_longer(c(approve_est, disprove_est, approve_lower, disprove_lower, approve_upper, disprove_upper), names_to="type", values_to="model") %>%
  mutate(
    m_type = stringr::str_extract(type, "(?<=_).+"),
    type = stringr::str_extract(type, ".+(?=_)")
  ) %>%
  select(c(type, m_type, model, date))


model_k_all <- merge(model_k, model_sole, by=c("type", "date", "model", "m_type" ), all=T) %>%
  mutate(person = "Keir") %>%
  pivot_wider(names_from=m_type, values_from=model) 


## Boris Johnson


model_b <- model %>%
  filter(person == "Boris")



boris_lo_app <- loess(approve ~ date_index, model_b, span = 0.5)
boris_lo_dis <- loess(disprove ~ date_index, model_b, span = 0.5)

preds_approve <- predict(boris_lo_app, se = T)
preds_disprove <- predict(boris_lo_dis, se = T)

model_b$approve_est <- preds_approve$fit
model_b$approve_lower <- preds_approve$fit - qt(0.95,preds_approve$df)*preds_approve$se
model_b$approve_upper <- preds_approve$fit + qt(0.95,preds_approve$df)*preds_approve$se

model_b$disprove_est <- preds_disprove$fit
model_b$disprove_lower <- preds_disprove$fit - qt(0.95,preds_disprove$df)*preds_disprove$se
model_b$disprove_upper <- preds_disprove$fit + qt(0.95,preds_disprove$df)*preds_disprove$se


all_dates <- seq(min(model_b$date, na.rm = T), max(model_b$date, na.rm = T), by="days")
missing_dates <- setdiff(all_dates, model_b$date)

model_sole <- model_b %>%
  select(c(approve_est, disprove_est, approve_lower,disprove_lower, approve_upper, disprove_upper, date)) %>%
  pivot_longer(c(approve_est, disprove_est, approve_lower,disprove_lower, approve_upper, disprove_upper), names_to="type", values_to="model") %>%
  mutate(
    m_type = stringr::str_extract(type, "(?<=_).+"),
    type = stringr::str_extract(type, ".+(?=_)")
  ) %>%
  group_by(type, m_type) %>%
  summarise(
    model = approx(x=date, y=model, xout = missing_dates)$y,
    date = missing_dates,
  ) %>%
  mutate(
    date = as.Date(date,origin="1970-01-01")
  )

model_b <- model_b %>%
  pivot_longer(c(approve_est, disprove_est, approve_lower, disprove_lower, approve_upper, disprove_upper), names_to="type", values_to="model") %>%
  mutate(
    m_type = stringr::str_extract(type, "(?<=_).+"),
    type = stringr::str_extract(type, ".+(?=_)")
  ) %>%
  select(c(type, m_type, model, date))


model_b_all <- merge(model_b, model_sole, by=c("type", "date", "model", "m_type" ), all=T) %>%
  mutate(person = "Boris") %>%
  pivot_wider(names_from=m_type, values_from=model) 

model_all <- merge(model_b_all, model_k_all, by=c("type", "date", "est", "person", "lower", "upper"), all = T)

points <- model %>%
  select(date, approve, disprove, person) %>%
  pivot_longer(c(approve, disprove), names_to="type", values_to="points")


model_fin <- merge(model_all, points, by=c("type", "date", "person"), all = T) %>%
  arrange(person, type, date)

last_frame <- model_fin %>%
  filter(date == max(date)) %>%
  mutate(
    points = NA,
    date = NA
  )

to_today <- seq(max(model_fin$date, na.rm = T) + days(1), Sys.Date(), by="days")
all_dates <- rep(to_today, 4)
all_final_frames <- as.data.frame(sapply(last_frame, rep.int, times=length(to_today))) %>%
  arrange(type, person)
all_final_frames$date <- all_dates

export <- merge(model_fin, all_final_frames, by=c("type", "date", "person", "est", "lower", "upper", "points"), all = T) %>%
  arrange(person, type, date)

write.csv(export, "preds.csv", row.names = F)


