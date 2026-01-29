document.addEventListener('DOMContentLoaded', function() {
  const DISPOSABLE_DOMAINS = [
    'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
    'temp-mail.org', '10minutemail.com', 'fakeinbox.com', 'trashmail.com',
    'tempail.com', 'dispostable.com', 'yopmail.com', 'maildrop.cc',
    'sharklasers.com', 'guerrillamail.info', 'grr.la', 'spam4.me',
    'tempmailo.com', 'mohmal.com', 'getnada.com', 'mailnesia.com',
    'temp.email', 'tempinbox.com', 'fakemailgenerator.com', 'emailondeck.com',
    'mintemail.com', 'discard.email', 'spamgourmet.com', 'mytemp.email'
  ];
  
  function isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
    if (!emailRegex.test(email)) return false;
    
    const domain = email.split('@')[1].toLowerCase();
    if (DISPOSABLE_DOMAINS.some(d => domain.includes(d))) return false;
    
    if (domain.length < 4) return false;
    
    return true;
  }
  
  const appointmentForm = document.getElementById('appointmentForm');
  const appointmentDate = document.getElementById('appointmentDate');
  
  if (appointmentDate) {
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 1);
    
    const maxDate = new Date(today);
    maxDate.setMonth(today.getMonth() + 3);
    
    appointmentDate.min = minDate.toISOString().split('T')[0];
    appointmentDate.max = maxDate.toISOString().split('T')[0];
  }
  
  if (appointmentForm) {
    appointmentForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const emailInput = document.getElementById('appointmentEmail');
      const email = emailInput ? emailInput.value.trim() : '';
      
      if (!isValidEmail(email)) {
        alert('Please enter a valid email address. Temporary or disposable emails are not allowed.');
        if (emailInput) emailInput.focus();
        return;
      }
      
      const submitBtn = appointmentForm.querySelector('.form-submit');
      const originalText = submitBtn.innerHTML;
      
      submitBtn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon><span>Sending...</span>';
      submitBtn.disabled = true;
      
      try {
        const formData = new FormData(appointmentForm);
        const response = await fetch(appointmentForm.action, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          submitBtn.innerHTML = '<ion-icon name="checkmark-circle-outline"></ion-icon><span>Request Submitted!</span>';
          submitBtn.style.background = '#4caf50';
          
          setTimeout(function() {
            appointmentForm.reset();
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            submitBtn.style.background = '';
          }, 3000);
        } else {
          const data = await response.json();
          throw new Error(data.error || 'Form submission failed');
        }
      } catch (error) {
        console.error('Form submission error:', error);
        submitBtn.innerHTML = '<ion-icon name="alert-circle-outline"></ion-icon><span>Error - Try Again</span>';
        submitBtn.style.background = '#e74c3c';
        
        setTimeout(function() {
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
          submitBtn.style.background = '';
        }, 3000);
      }
    });
  }
  
  const searchInput = document.getElementById('supportSearch');
  if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim().toLowerCase();
        if (query) {
          const sections = {
            'crisis': '#crisis',
            'emergency': '#crisis',
            '988': '#crisis',
            'hotline': '#helplines',
            'helpline': '#helplines',
            'call': '#helplines',
            'phone': '#helplines',
            'resource': '#resources',
            'anxiety': '#resources',
            'depression': '#resources',
            'stress': '#resources',
            'self-help': '#self-help',
            'breathing': '#self-help',
            'grounding': '#self-help',
            'exercise': '#self-help',
            'appointment': '#appointment',
            'schedule': '#appointment',
            'book': '#appointment',
            'session': '#appointment',
            'therapy': '#appointment',
            'faq': '#faq',
            'question': '#faq'
          };
          
          let targetSection = null;
          for (const [keyword, section] of Object.entries(sections)) {
            if (query.includes(keyword)) {
              targetSection = section;
              break;
            }
          }
          
          if (targetSection) {
            const element = document.querySelector(targetSection);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          } else {
            window.location.href = '../resourcelib/?search=' + encodeURIComponent(query);
          }
        }
      }
    });
  }
  
  // Legacy FAQ item handling (backwards compatibility)
  const faqItems = document.querySelectorAll('.faq-item');
  if (faqItems.length > 0) {
    faqItems.forEach(item => {
      const summary = item.querySelector('summary');
      if (summary) {
        summary.addEventListener('click', function() {
          faqItems.forEach(other => {
            if (other !== item && other.hasAttribute('open')) {
              other.removeAttribute('open');
            }
          });
        });
      }
    });
  }
  
  const scrollProgress = document.querySelector('.scroll-progress');
  const progressBar = document.querySelector('.scroll-progress__bar');
  const dots = document.querySelectorAll('.scroll-progress__dot');
  
  if (scrollProgress && dots.length > 0) {
    const sections = [
      { id: 'crisis', element: document.getElementById('crisis') },
      { id: 'helplines', element: document.getElementById('helplines') },
      { id: 'resources', element: document.getElementById('resources') },
      { id: 'self-help', element: document.getElementById('self-help') },
      { id: 'appointment', element: document.getElementById('appointment') },
      { id: 'faq', element: document.getElementById('faq') }
    ].filter(s => s.element);
    
    dots.forEach(dot => {
      dot.addEventListener('click', function() {
        const sectionId = this.getAttribute('data-section');
        const section = document.getElementById(sectionId);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
    
    function updateScrollProgress() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;
      
      if (progressBar) {
        progressBar.style.setProperty('--progress', scrollPercent + '%');
      }
      
      if (scrollTop > 300) {
        scrollProgress.classList.add('visible');
      } else {
        scrollProgress.classList.remove('visible');
      }
      
      let currentSection = null;
      const viewportMiddle = scrollTop + window.innerHeight / 3;
      
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section.element.offsetTop <= viewportMiddle) {
          currentSection = section.id;
          break;
        }
      }
      
      dots.forEach(dot => {
        const sectionId = dot.getAttribute('data-section');
        if (sectionId === currentSection) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }
    
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    updateScrollProgress();
  }
  
  // ========================================
  // BREATHING EXERCISE
  // ========================================
  
  const breathingModal = document.getElementById('breathingModal');
  const openBreathingBtn = document.getElementById('openBreathingTool');
  const breathingCircle = document.getElementById('breathingCircle');
  const breathingText = document.getElementById('breathingText');
  const breathingTimer = document.getElementById('breathingTimer');
  const startBreathingBtn = document.getElementById('startBreathing');
  const stopBreathingBtn = document.getElementById('stopBreathing');
  const breathingCyclesEl = document.getElementById('breathingCycles');
  const breathingDurationEl = document.getElementById('breathingDuration');
  const breathingAudioToggle = document.getElementById('breathingAudio');
  const breathingContainer = document.querySelector('.breathing-circle-container');
  
  const breathingPatterns = {
    '478': { inhale: 4, hold: 7, exhale: 8, name: '4-7-8 Relaxing' },
    'box': { inhale: 4, hold: 4, exhale: 4, holdOut: 4, name: 'Box Breathing' },
    'calm': { inhale: 4, hold: 0, exhale: 6, name: 'Calm Breathing' }
  };
  
  let currentPattern = '478';
  let breathingInterval = null;
  let breathingTimeout = null;
  let breathingCycles = 0;
  let breathingStartTime = null;
  let durationInterval = null;
  
  // Audio context for breathing cues
  let audioContext = null;
  
  function playTone(frequency, duration) {
    if (!breathingAudioToggle?.checked) return;
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
      console.log('Audio not supported');
    }
  }
  
  function openBreathingModal() {
    breathingModal?.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  }
  
  function closeBreathingModal() {
    breathingModal?.classList.remove('is-active');
    document.body.style.overflow = '';
    stopBreathing();
  }
  
  function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  function updateDuration() {
    if (breathingStartTime) {
      const elapsed = Date.now() - breathingStartTime;
      if (breathingDurationEl) breathingDurationEl.textContent = formatDuration(elapsed);
    }
  }
  
  function runBreathingCycle() {
    const pattern = breathingPatterns[currentPattern];
    let phase = 'inhale';
    let countdown = pattern.inhale;
    
    function updatePhase() {
      if (breathingText) {
        const phaseTexts = {
          'inhale': 'Breathe In',
          'hold': 'Hold',
          'exhale': 'Breathe Out',
          'holdOut': 'Hold'
        };
        breathingText.textContent = phaseTexts[phase];
      }
      if (breathingTimer) breathingTimer.textContent = countdown;
      
      // Update circle class
      breathingCircle?.classList.remove('is-inhaling', 'is-holding', 'is-exhaling');
      if (phase === 'inhale') {
        breathingCircle?.classList.add('is-inhaling');
        breathingCircle.style.transition = `transform ${pattern.inhale}s ease-in-out`;
      } else if (phase === 'hold' || phase === 'holdOut') {
        breathingCircle?.classList.add('is-holding');
      } else if (phase === 'exhale') {
        breathingCircle?.classList.add('is-exhaling');
        breathingCircle.style.transition = `transform ${pattern.exhale}s ease-in-out`;
      }
    }
    
    updatePhase();
    playTone(440, 0.2); // Start tone
    
    breathingInterval = setInterval(() => {
      countdown--;
      
      if (countdown <= 0) {
        // Move to next phase
        if (phase === 'inhale') {
          if (pattern.hold > 0) {
            phase = 'hold';
            countdown = pattern.hold;
            playTone(523, 0.15);
          } else {
            phase = 'exhale';
            countdown = pattern.exhale;
            playTone(392, 0.2);
          }
        } else if (phase === 'hold') {
          phase = 'exhale';
          countdown = pattern.exhale;
          playTone(392, 0.2);
        } else if (phase === 'exhale') {
          if (pattern.holdOut) {
            phase = 'holdOut';
            countdown = pattern.holdOut;
            playTone(349, 0.15);
          } else {
            // Cycle complete
            breathingCycles++;
            if (breathingCyclesEl) breathingCyclesEl.textContent = breathingCycles;
            phase = 'inhale';
            countdown = pattern.inhale;
            playTone(440, 0.2);
          }
        } else if (phase === 'holdOut') {
          // Cycle complete
          breathingCycles++;
          if (breathingCyclesEl) breathingCyclesEl.textContent = breathingCycles;
          phase = 'inhale';
          countdown = pattern.inhale;
          playTone(440, 0.2);
        }
        updatePhase();
      } else {
        if (breathingTimer) breathingTimer.textContent = countdown;
      }
    }, 1000);
  }
  
  function startBreathing() {
    breathingCycles = 0;
    if (breathingCyclesEl) breathingCyclesEl.textContent = '0';
    breathingStartTime = Date.now();
    durationInterval = setInterval(updateDuration, 1000);
    
    startBreathingBtn.style.display = 'none';
    stopBreathingBtn.style.display = 'block';
    breathingContainer?.classList.add('is-active');
    
    runBreathingCycle();
  }
  
  function stopBreathing() {
    if (breathingInterval) {
      clearInterval(breathingInterval);
      breathingInterval = null;
    }
    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }
    
    startBreathingBtn.style.display = 'block';
    stopBreathingBtn.style.display = 'none';
    breathingContainer?.classList.remove('is-active');
    
    breathingCircle?.classList.remove('is-inhaling', 'is-holding', 'is-exhaling');
    if (breathingText) breathingText.textContent = 'Ready';
    if (breathingTimer) breathingTimer.textContent = '';
  }
  
  // Event listeners for breathing
  openBreathingBtn?.addEventListener('click', openBreathingModal);
  
  breathingModal?.querySelector('.wellness-modal__backdrop')?.addEventListener('click', closeBreathingModal);
  breathingModal?.querySelector('.wellness-modal__close')?.addEventListener('click', closeBreathingModal);
  
  startBreathingBtn?.addEventListener('click', startBreathing);
  stopBreathingBtn?.addEventListener('click', stopBreathing);
  
  // Pattern selection
  document.querySelectorAll('.breathing-pattern').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.breathing-pattern').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      currentPattern = btn.dataset.pattern;
      stopBreathing();
    });
  });
  
  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (breathingModal?.classList.contains('is-active')) closeBreathingModal();
      if (groundingModal?.classList.contains('is-active')) closeGroundingModal();
    }
  });
  
  // ========================================
  // GROUNDING EXERCISE
  // ========================================
  
  const groundingModal = document.getElementById('groundingModal');
  const openGroundingBtn = document.getElementById('openGroundingTool');
  const groundingSteps = document.querySelectorAll('.grounding-step');
  const groundingProgressBar = document.getElementById('groundingProgressBar');
  const groundingPrevBtn = document.getElementById('groundingPrev');
  const groundingNextBtn = document.getElementById('groundingNext');
  const groundingRestartBtn = document.getElementById('groundingRestart');
  
  const stepOrder = ['5', '4', '3', '2', '1', 'complete'];
  let currentGroundingStep = 0;
  
  function openGroundingModal() {
    groundingModal?.classList.add('is-active');
    document.body.style.overflow = 'hidden';
    resetGrounding();
  }
  
  function closeGroundingModal() {
    groundingModal?.classList.remove('is-active');
    document.body.style.overflow = '';
  }
  
  function resetGrounding() {
    currentGroundingStep = 0;
    updateGroundingStep();
    
    // Clear all inputs
    document.querySelectorAll('.grounding-input').forEach(input => {
      input.value = '';
    });
    
    groundingPrevBtn.style.display = 'block';
    groundingNextBtn.style.display = 'block';
    groundingRestartBtn.style.display = 'none';
  }
  
  function updateGroundingStep() {
    const stepId = stepOrder[currentGroundingStep];
    
    // Update active step
    groundingSteps.forEach(step => {
      step.classList.remove('is-active');
      if (step.dataset.step === stepId) {
        step.classList.add('is-active');
      }
    });
    
    // Update progress bar
    const progress = (currentGroundingStep / (stepOrder.length - 1)) * 100;
    if (groundingProgressBar) groundingProgressBar.style.width = `${progress}%`;
    
    // Update buttons
    groundingPrevBtn.disabled = currentGroundingStep === 0;
    
    if (stepId === 'complete') {
      groundingPrevBtn.style.display = 'none';
      groundingNextBtn.style.display = 'none';
      groundingRestartBtn.style.display = 'block';
    } else {
      groundingPrevBtn.style.display = 'block';
      groundingNextBtn.style.display = 'block';
      groundingRestartBtn.style.display = 'none';
    }
    
    // Focus first input of current step
    const currentStepEl = document.querySelector(`.grounding-step[data-step="${stepId}"]`);
    const firstInput = currentStepEl?.querySelector('.grounding-input');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }
  
  function goToNextStep() {
    if (currentGroundingStep < stepOrder.length - 1) {
      currentGroundingStep++;
      updateGroundingStep();
    }
  }
  
  function goToPrevStep() {
    if (currentGroundingStep > 0) {
      currentGroundingStep--;
      updateGroundingStep();
    }
  }
  
  // Event listeners for grounding
  openGroundingBtn?.addEventListener('click', openGroundingModal);
  
  groundingModal?.querySelector('.wellness-modal__backdrop')?.addEventListener('click', closeGroundingModal);
  groundingModal?.querySelector('.wellness-modal__close')?.addEventListener('click', closeGroundingModal);
  
  groundingNextBtn?.addEventListener('click', goToNextStep);
  groundingPrevBtn?.addEventListener('click', goToPrevStep);
  groundingRestartBtn?.addEventListener('click', resetGrounding);
  
  // Allow Enter key to go to next in grounding inputs
  document.querySelectorAll('.grounding-input').forEach((input, index, inputs) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const currentStep = input.closest('.grounding-step');
        const stepInputs = currentStep.querySelectorAll('.grounding-input');
        const inputIndex = Array.from(stepInputs).indexOf(input);
        
        if (inputIndex < stepInputs.length - 1) {
          stepInputs[inputIndex + 1].focus();
        } else {
          goToNextStep();
        }
      }
    });
  });

  // ========================================
  // SPLIT PANEL FAQ FUNCTIONALITY
  // ========================================

  const faqSearchInput = document.getElementById('faqSearchInput');
  const faqSearchClear = document.getElementById('faqSearchClear');
  const faqTabs = document.querySelectorAll('.faq-split__tab');
  const faqQuestions = document.querySelectorAll('.faq-split__question');
  const faqNoResults = document.getElementById('faqNoResults');
  const faqAnswerPanel = document.getElementById('faqAnswerPanel');
  const faqPrevBtn = document.getElementById('faqPrevBtn');
  const faqNextBtn = document.getElementById('faqNextBtn');

  let activeCategory = 'all';
  let currentFaqId = '1';

  function getQuestionDataFromDOM(faqId) {
    const questionEl = document.querySelector(`.faq-split__question[data-faq-id="${faqId}"]`);
    if (!questionEl) return null;

    const catEl = questionEl.querySelector('.faq-split__question-cat');
    const questionTextEl = questionEl.querySelector('.faq-split__question-text');
    const answerDataEl = questionEl.querySelector('.faq-split__answer-data');
    const tipDataEl = questionEl.querySelector('.faq-split__tip-data');

    return {
      category: catEl ? catEl.textContent.trim() : '',
      categoryIcon: questionEl.dataset.catIcon || 'help-circle-outline',
      question: questionTextEl ? questionTextEl.textContent : '',
      answer: answerDataEl ? answerDataEl.textContent : '',
      tip: tipDataEl ? tipDataEl.textContent : ''
    };
  }

  function updateAnswerPanel(faqId) {
    const data = getQuestionDataFromDOM(faqId);
    if (!data || !faqAnswerPanel) return;

    currentFaqId = faqId;

    const answerCat = document.getElementById('faqAnswerCat');
    const answerNum = document.getElementById('faqAnswerNum');
    const answerQuestion = document.getElementById('faqAnswerQuestion');
    const answerContent = document.getElementById('faqAnswerContent');
    const answerTip = document.getElementById('faqAnswerTip');

    if (answerCat) {
      answerCat.innerHTML = `<ion-icon name="${data.categoryIcon}"></ion-icon> ${data.category}`;
    }
    if (answerNum) {
      answerNum.textContent = `Question ${faqId.padStart(2, '0')}`;
    }
    if (answerQuestion) {
      answerQuestion.textContent = data.question;
    }
    if (answerContent) {
      answerContent.innerHTML = `<p>${data.answer}</p>`;
    }
    if (answerTip) {
      answerTip.textContent = data.tip;
    }

    faqQuestions.forEach(q => {
      q.classList.toggle('active', q.dataset.faqId === faqId);
    });

    faqAnswerPanel.style.animation = 'none';
    faqAnswerPanel.offsetHeight;
    faqAnswerPanel.style.animation = 'faq-answer-slide-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

    document.querySelectorAll('.faq-split__feedback-btn').forEach(btn => {
      btn.classList.remove('selected');
    });

    updateNavButtons();
  }

  function getVisibleQuestions() {
    return Array.from(faqQuestions).filter(q => !q.classList.contains('hidden'));
  }

  function updateNavButtons() {
    const visible = getVisibleQuestions();
    const currentIndex = visible.findIndex(q => q.dataset.faqId === currentFaqId);

    if (faqPrevBtn) {
      faqPrevBtn.disabled = currentIndex <= 0;
    }
    if (faqNextBtn) {
      faqNextBtn.disabled = currentIndex >= visible.length - 1;
    }
  }

  faqQuestions.forEach(question => {
    question.addEventListener('click', function() {
      const faqId = this.dataset.faqId;
      updateAnswerPanel(faqId);
    });
  });

  faqTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const category = this.dataset.category;
      activeCategory = category;

      faqTabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');

      if (faqSearchInput) {
        faqSearchInput.value = '';
        if (faqSearchClear) faqSearchClear.style.display = 'none';
      }

      filterQuestions('', category);
    });
  });

  if (faqSearchInput) {
    faqSearchInput.addEventListener('input', function() {
      const query = this.value.trim().toLowerCase();
      
      if (faqSearchClear) {
        faqSearchClear.style.display = query.length > 0 ? 'block' : 'none';
      }

      if (query.length > 0) {
        faqTabs.forEach(t => t.classList.remove('active'));
        document.querySelector('.faq-split__tab[data-category="all"]')?.classList.add('active');
        activeCategory = 'all';
      }

      filterQuestions(query, 'all');
    });

    if (faqSearchClear) {
      faqSearchClear.addEventListener('click', function() {
        faqSearchInput.value = '';
        faqSearchClear.style.display = 'none';
        filterQuestions('', activeCategory);
        faqSearchInput.focus();
      });
    }
  }

  function filterQuestions(query, category) {
    let visibleCount = 0;
    let firstVisible = null;

    faqQuestions.forEach(question => {
      const qCategory = question.dataset.category;
      const qId = question.dataset.faqId;
      
      const questionTextEl = question.querySelector('.faq-split__question-text');
      const answerDataEl = question.querySelector('.faq-split__answer-data');
      const questionText = questionTextEl ? questionTextEl.textContent : '';
      const answerText = answerDataEl ? answerDataEl.textContent : '';
      const searchText = (questionText + ' ' + answerText).toLowerCase();
      const matchesCategory = category === 'all' || qCategory === category;
      const matchesSearch = query === '' || searchText.includes(query);

      if (matchesCategory && matchesSearch) {
        question.classList.remove('hidden');
        visibleCount++;
        if (!firstVisible) firstVisible = question;

        const textEl = question.querySelector('.faq-split__question-text');
        if (textEl) {
          if (query.length > 0) {
            const originalText = textEl.getAttribute('data-original-text') || textEl.textContent;
            textEl.setAttribute('data-original-text', originalText);
            textEl.innerHTML = originalText.replace(
              new RegExp(`(${escapeRegex(query)})`, 'gi'),
              '<mark class="faq-split__highlight">$1</mark>'
            );
          } else {
            const originalText = textEl.getAttribute('data-original-text');
            if (originalText) textEl.textContent = originalText;
          }
        }
      } else {
        question.classList.add('hidden');
        const textEl = question.querySelector('.faq-split__question-text');
        if (textEl) {
          const originalText = textEl.getAttribute('data-original-text');
          if (originalText) textEl.textContent = originalText;
        }
      }
    });

    if (faqNoResults) {
      faqNoResults.style.display = visibleCount === 0 ? 'flex' : 'none';
    }

    if (firstVisible && !firstVisible.classList.contains('active')) {
      updateAnswerPanel(firstVisible.dataset.faqId);
    }

    updateNavButtons();
  }

  if (faqPrevBtn) {
    faqPrevBtn.addEventListener('click', function() {
      const visible = getVisibleQuestions();
      const currentIndex = visible.findIndex(q => q.dataset.faqId === currentFaqId);
      if (currentIndex > 0) {
        updateAnswerPanel(visible[currentIndex - 1].dataset.faqId);
      }
    });
  }

  if (faqNextBtn) {
    faqNextBtn.addEventListener('click', function() {
      const visible = getVisibleQuestions();
      const currentIndex = visible.findIndex(q => q.dataset.faqId === currentFaqId);
      if (currentIndex < visible.length - 1) {
        updateAnswerPanel(visible[currentIndex + 1].dataset.faqId);
      }
    });
  }

  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const feedbackBtns = document.querySelectorAll('.faq-split__feedback-btn');
  feedbackBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const feedback = this.dataset.feedback;
      const wasSelected = this.classList.contains('selected');
      
      feedbackBtns.forEach(b => b.classList.remove('selected'));

      if (!wasSelected) {
        this.classList.add('selected');
        
        const icon = this.querySelector('ion-icon');
        if (icon) {
          icon.style.transform = 'scale(1.3)';
          setTimeout(() => {
            icon.style.transform = '';
          }, 200);
        }

        console.log(`FAQ #${currentFaqId} feedback: ${feedback}`);
      }
    });
  });

  updateNavButtons();
});
