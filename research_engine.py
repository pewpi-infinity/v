#!/usr/bin/env python3

import requests
from bs4 import BeautifulSoup
import os
import re
import subprocess
import zipfile

# --- CONFIGURATION ---
PUSH_THRESHOLD = 1000
ZIP_DIR = "master_zips"
PUSH_SCRIPT_PATH = "./git_push_script.sh"
RESEARCH_LIST_FILE = "research_list.txt"
BASE_WIKI_URL = "https://en.wikipedia.org/wiki/"
# --- END CONFIGURATION ---

def fetch_webpage_content(url):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    print(f"Fetching data from: {url}...")
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status() 
        return response.text
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        return None

def execute_git_push(filename):
    print("\n--- Executing Auto-Push Sequence ---")
    try:
        # Use check=True to raise an error if the command fails
        result = subprocess.run([PUSH_SCRIPT_PATH, filename], capture_output=True, text=True, check=True)
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"ERROR: Git push script failed. Details: {e.stderr}")
    except Exception as e:
        print(f"ERROR: General failure executing push script: {e}")

def create_tokens(url):
    if not os.path.exists(ZIP_DIR):
        os.makedirs(ZIP_DIR)

    html_content = fetch_webpage_content(url)
    if html_content is None:
        return

    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        content_div = soup.find('div', id='mw-content-text')
        
        raw_text = ""
        if content_div:
            text_elements = content_div.find_all(['p', 'li', 'h1', 'h2', 'h3'])
            for element in text_elements:
                raw_text += element.get_text() + "\n"
        
        cleaned_text = re.sub(r'\[\d+\]', '', raw_text)
        cleaned_text = ' '.join(cleaned_text.split())

        if not cleaned_text:
            return

        content_size = len(cleaned_text)
        base_name = url.split('/')[-1].replace('_', '-').lower()
        temp_txt_filename = f"{base_name}.txt"
        zip_filename = f"{base_name}.zip"
        zip_file_path = os.path.join(ZIP_DIR, zip_filename)
        
        with open(temp_txt_filename, 'w', encoding='utf-8') as f:
            f.write(cleaned_text)
        
        with zipfile.ZipFile(zip_file_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            zipf.write(temp_txt_filename, arcname=temp_txt_filename)

        print(f"Successfully created master zip file: {zip_filename}")
        os.remove(temp_txt_filename)
        
        if content_size >= PUSH_THRESHOLD:
            execute_git_push(zip_filename)

    except Exception as e:
        print(f"An unexpected error occurred: {e}")

def scrape_topics_from_file():
    """Reads topics from a file and runs the scraper for each one."""
    try:
        with open(RESEARCH_LIST_FILE, 'r') as f:
            topics = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print(f"ERROR: Research list file '{RESEARCH_LIST_FILE}' not found. Please create it.")
        return

    for topic in topics:
        if not topic.startswith('http'):
            # Construct the full URL for Wikipedia topics
            url = BASE_WIKI_URL + topic
        else:
            url = topic # Use full URL if provided
        
        print("\n==============================================")
        print(f"STARTING RESEARCH ON TOPIC: {topic}")
        create_tokens(url)
        print("==============================================")

if __name__ == "__main__":
    scrape_topics_from_file()
